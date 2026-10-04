import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";

export const dynamic = "force-dynamic";

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

const ID_TO_SOURCE_NAME: Record<string, string> = {
  "1": "telex",
  "2": "24hu",
  "3": "index",
  "4": "hvg",
  "5": "portfolio",
  "6": "444",
  "7": "origo",
};

const SOURCE_NAME_TO_ID: Record<string, number> = {
  telex: 1,
  "24hu": 2,
  "24": 2,
  index: 3,
  hvg: 4,
  portfolio: 5,
  "444": 6,
  "444hu": 6,
  origo: 7,
};

type SummaryRow = RowDataPacket & {
  id: number;
  url: string | null;
  title: string | null;
  language: string | null;
  source_id?: number | null;
  source_name?: string | null;
  source?: string | null;
  content: string | null;
  detailed_content: string | null;
  category: string | null;
  plagiarism_score: number | null;
  ai_clean: number | null;
  created_at: Date | string | null;
  trend_keywords?: string | null;
};

function fallbackTitle(row: SummaryRow): string {
  if (row.title && row.title.trim().length > 0) {
    return row.title.trim();
  }

  const slug = row.url?.split("/").pop() || "";
  const words = slug.split("-").filter((word) => word.length > 2);

  if (words.length >= 3) {
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return row.content?.split("\n")[0]?.trim() || "Cím nélkül";
}

function parsePositiveInt(
  value: string | null,
  fallback: number
): number {
  if (value === null || !/^\d+$/.test(value)) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function createSearchFilter(q: string): {
  sql: string;
  params: string[];
} {
  if (!q) {
    return {
      sql: "",
      params: [],
    };
  }

  // A search term is plain text; user supplied LIKE metacharacters must not
  // silently turn the filter into a wildcard expression.
  const escaped = q.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;

  return {
    sql: `
      AND (
        s.title LIKE ? ESCAPE '\\\\'
        OR s.content LIKE ? ESCAPE '\\\\'
        OR s.detailed_content LIKE ? ESCAPE '\\\\'
      )
    `,
    params: [
      pattern,
      pattern,
      pattern,
    ],
  };
}

function sourceIdFromFilter(rawValue: string): number | undefined {
  const raw = rawValue.trim();

  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, "");
  const withoutTld = normalized.endsWith(".hu")
    ? normalized.slice(0, -3)
    : normalized;
  const candidates = [
    normalized,
    withoutTld,
    normalized.replace(/\./g, ""),
  ];

  for (const candidate of candidates) {
    const id = SOURCE_NAME_TO_ID[candidate];
    if (id !== undefined) return id;
  }

  return undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const db = getPool();

    // ---------------------------------------------------------
    // 0) ID ALAPÚ LEKÉRDEZÉS
    // ---------------------------------------------------------

    const idParam = searchParams.get("id");

    if (idParam !== null) {
      if (!/^\d+$/.test(idParam)) {
        return NextResponse.json(
          {
            error: "Érvénytelen cikkazonosító.",
          },
          {
            status: 400,
          }
        );
      }

      const id = Number(idParam);

      if (
        !Number.isSafeInteger(id) ||
        id < 1
      ) {
        return NextResponse.json(
          {
            error: "Érvénytelen cikkazonosító.",
          },
          {
            status: 400,
          }
        );
      }

      const query = `
        SELECT
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
          a.source AS source,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at,
          s.trend_keywords
        FROM summaries s
        LEFT JOIN articles a
          ON s.article_id = a.id
        LEFT JOIN sources src
          ON a.source_id = src.id
        WHERE s.id = ?
        LIMIT 1
      `;

      const [rows] =
        await db.query<SummaryRow[]>(
          query,
          [id]
        );

      if (rows.length === 0) {
        return NextResponse.json(
          {
            error: "Cikk nem található.",
          },
          {
            status: 404,
          }
        );
      }

      const row = rows[0];

      return NextResponse.json({
        ...row,
        title: fallbackTitle(row),
        keywords: row.trend_keywords
          ? row.trend_keywords
              .split(",")
              .map((keyword) =>
                keyword.trim()
              )
              .filter(Boolean)
          : [],
      });
    }

    // ---------------------------------------------------------
    // 1) PARAMÉTEREK
    // ---------------------------------------------------------

    const page = Math.min(
      parsePositiveInt(
        searchParams.get("page"),
        1
      ),
      100000
    );

    // Keep the documented pagination parameter meaningful for search/feed
    // callers while bounding it so an arbitrary request cannot create an
    // oversized result page.
    const limit = Math.min(
      parsePositiveInt(searchParams.get("limit"), 10),
      100
    );
    const offset =
      (page - 1) * limit;

    const q = (
      searchParams.get("q") ?? ""
    )
      .trim()
      .slice(0, 250);

    const searchFilter =
      createSearchFilter(q);

    // ---------------------------------------------------------
    // FORRÁSOK
    // ---------------------------------------------------------

    const sourcesRaw =
      searchParams.getAll("source");

    const sourceIds = [
      ...new Set(
        sourcesRaw.map((raw) => {
            const trimmed = raw.trim();
            if (/^\d+$/.test(trimmed)) {
              const id = Number(trimmed);
              return Number.isSafeInteger(id) && id > 0 ? id : undefined;
            }
            return sourceIdFromFilter(
              ID_TO_SOURCE_NAME[trimmed] ?? trimmed
            );
          })
          .filter((id): id is number => id !== undefined)
      ),
    ];

    // Ismeretlen forrásfilter ne essen vissza véletlenül szűretlen feedre.
    if (sourcesRaw.length > 0 && sourceIds.length === 0) {
      return NextResponse.json([]);
    }

    // ---------------------------------------------------------
    // KATEGÓRIÁK
    // ---------------------------------------------------------

    const categories = [
      ...new Set(
        searchParams
          .getAll("category")
          .map((category) =>
            category.trim()
          )
          .filter(Boolean)
          .slice(0, 50)
      ),
    ];

    // ---------------------------------------------------------
    // 2) FORRÁS + KATEGÓRIA
    // ---------------------------------------------------------

    const todayFilter = searchParams.get("today") === "true";
    const todayBounds = todayFilter ? businessDayBounds(new Date()) : null;

    if (
      sourceIds.length > 0 ||
      categories.length > 0
    ) {
      const whereParts: string[] =
        [];

      const params: Array<
        string | number
      > = [];

      if (sourceIds.length > 0) {
        // An explicit source filter must not expose rows from a disabled
        // source. Keep source-less/orphaned summaries in the unfiltered feed,
        // but require the canonical source row to be active for this branch.
        whereParts.push("src.is_active = 1");
        whereParts.push(
          `a.source_id IN (${sourceIds
            .map(() => "?")
            .join(",")})`
        );

        params.push(...sourceIds);
      }

      if (todayBounds) {
        whereParts.push("s.created_at >= ? AND s.created_at < ?");
        params.push(mysqlUtc(todayBounds.start), mysqlUtc(todayBounds.end));
      }

      if (
        categories.length > 0
      ) {
        whereParts.push(
          `s.category IN (${categories
            .map(() => "?")
            .join(",")})`
        );

        params.push(
          ...categories
        );
      }

      const whereClause =
        `WHERE ${whereParts.join(
          " AND "
        )}`;

      const query = `
        SELECT
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at
        FROM summaries s
        LEFT JOIN articles a
          ON s.article_id = a.id
        LEFT JOIN sources src
          ON a.source_id = src.id
        ${whereClause}
        ${searchFilter.sql}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ? OFFSET ?
      `;

      params.push(
        ...searchFilter.params,
        limit,
        offset
      );

      const [rows] =
        await db.query<
          SummaryRow[]
        >(query, params);

      return NextResponse.json(
        rows.map((row) => ({
          ...row,
          title:
            fallbackTitle(row),
        }))
      );
    }

    // ---------------------------------------------------------
    // 3) MAI NAP
    // ---------------------------------------------------------

    if (todayFilter) {
      const today = mysqlUtc(todayBounds!.start);
      const tomorrow = mysqlUtc(todayBounds!.end);

      const todayQuery = `
        SELECT
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at
        FROM summaries s
        LEFT JOIN articles a
          ON s.article_id = a.id
        LEFT JOIN sources src
          ON a.source_id = src.id
        WHERE
          s.created_at >= ?
          AND s.created_at < ?
        ${searchFilter.sql}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] =
        await db.query<
          SummaryRow[]
        >(
          todayQuery,
          [
            today,
            tomorrow,
            ...searchFilter.params,
            limit,
            offset,
          ]
        );

      return NextResponse.json(
        rows.map((row) => ({
          ...row,
          title:
            fallbackTitle(row),
        }))
      );
    }

    // ---------------------------------------------------------
    // 4) NORMÁL FEED + KERESÉS
    // ---------------------------------------------------------

    const query = `
      SELECT
        s.id,
        s.url,
        s.title,
        s.language,
        src.id AS source_id,
        src.name AS source_name,
        s.content,
        s.detailed_content,
        s.category,
        s.plagiarism_score,
        s.ai_clean,
        s.created_at
      FROM summaries s
      LEFT JOIN articles a
        ON s.article_id = a.id
      LEFT JOIN sources src
        ON a.source_id = src.id
      WHERE 1 = 1
      ${searchFilter.sql}
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] =
      await db.query<
        SummaryRow[]
      >(
        query,
        [
          ...searchFilter.params,
          limit,
          offset,
        ]
      );

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        title:
          fallbackTitle(row),
      }))
    );
  } catch (error) {
    console.error(
      "API /summaries hiba:",
      error
    );

    return NextResponse.json(
      {
        error:
          "summaries_query_failed",
      },
      {
        status: 500,
      }
    );
  }
}
