import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
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
  index: 3,
  hvg: 4,
  portfolio: 5,
  "444": 6,
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

  const pattern = `%${q}%`;

  return {
    sql: `
      AND (
        s.title LIKE ?
        OR s.content LIKE ?
        OR s.detailed_content LIKE ?
      )
    `,
    params: [
      pattern,
      pattern,
      pattern,
    ],
  };
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

    const limit = 10;
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

    const normalizedSources =
      sourcesRaw
        .map((source) => {
          if (
            ID_TO_SOURCE_NAME[source]
          ) {
            return ID_TO_SOURCE_NAME[
              source
            ];
          }

          return source
            .toLowerCase()
            .replace(".hu", "")
            .replace(/\./g, "");
        })
        .filter(Boolean);

    const sourceIds = [
      ...new Set(
        normalizedSources
          .map(
            (source) =>
              SOURCE_NAME_TO_ID[
                source
              ]
          )
          .filter(
            (
              id
            ): id is number =>
              id !== undefined
          )
      ),
    ];

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
        whereParts.push(
          `a.source_id IN (${sourceIds
            .map(() => "?")
            .join(",")})`
        );

        params.push(...sourceIds);
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

    const todayFilter =
      searchParams.get("today") ===
      "true";

    if (todayFilter) {
      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const tomorrow =
        new Date(today);

      tomorrow.setDate(
        today.getDate() + 1
      );

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
