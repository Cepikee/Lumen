import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";
import { checkPublicApiRateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

type SourceRow = RowDataPacket & { id: number; slug: string; name: string; count: number };
type CategoryRow = RowDataPacket & { category: string; count: number };
type CountRow = RowDataPacket & { total: number };

function sourceCandidates(value: string): string[] {
  const normalized = value.trim().toLowerCase().replace(/^www\./, "");
  if (!normalized || /^\d+$/.test(normalized)) return [];
  const withoutTld = normalized.endsWith(".hu") ? normalized.slice(0, -3) : normalized;
  return [...new Set([normalized, withoutTld, `${withoutTld}.hu`])];
}

function searchClause(query: string, alias = "su") {
  if (!query) return { sql: "", params: [] as string[] };
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const value = `%${escaped}%`;
  return {
    sql: ` AND (${alias}.title LIKE ? ESCAPE '\\\\' OR ${alias}.content LIKE ? ESCAPE '\\\\' OR ${alias}.detailed_content LIKE ? ESCAPE '\\\\')`,
    params: [value, value, value],
  };
}

export async function GET(req: Request) {
  if (!(await checkPublicApiRateLimit(req, "feed-facets", 120, 60_000))) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim().slice(0, 120);
    const category = (searchParams.get("category") || "").trim().slice(0, 100);
    const source = (searchParams.get("source") || "").trim().slice(0, 190);
    const today = searchParams.get("today") === "true";
    const search = searchClause(query);
    const baseParams: Array<string | number> = [...search.params];
    let timeSql = "";
    if (today) {
      const bounds = businessDayBounds(new Date());
      timeSql = " AND su.created_at >= ? AND su.created_at < ?";
      baseParams.push(mysqlUtc(bounds.start), mysqlUtc(bounds.end));
    }

    const [sourceRows] = await db.query<SourceRow[]>(
      `SELECT src.id, src.slug, src.name, COUNT(*) AS count
       FROM summaries su
       JOIN articles a ON a.id = su.article_id
       JOIN sources src ON src.id = a.source_id AND src.is_active = 1
       WHERE su.ai_clean = 1${search.sql}${timeSql}
       GROUP BY src.id, src.slug, src.name
       ORDER BY count DESC, src.name ASC`,
      baseParams
    );
    const [categoryRows] = await db.query<CategoryRow[]>(
      `SELECT TRIM(su.category) AS category, COUNT(*) AS count
       FROM summaries su
       WHERE su.ai_clean = 1
         AND NULLIF(TRIM(su.category), '') IS NOT NULL
         AND LOWER(TRIM(su.category)) NOT IN ('ismeretlen', 'unknown')${search.sql}${timeSql}
       GROUP BY TRIM(su.category)
       ORDER BY count DESC, category ASC`,
      baseParams
    );

    const totalWhere = ["su.ai_clean = 1"];
    const totalParams: Array<string | number> = [];
    const totalJoin = "LEFT JOIN articles a ON a.id = su.article_id LEFT JOIN sources src ON src.id = a.source_id";
    if (category) {
      totalWhere.push("LOWER(TRIM(su.category)) = LOWER(?)");
      totalParams.push(category);
    }
    if (source) {
      totalWhere.push("src.is_active = 1");
      if (/^\d+$/.test(source)) {
        totalWhere.push("src.id = ?");
        totalParams.push(Number(source));
      } else {
        const candidates = sourceCandidates(source);
        if (!candidates.length) totalWhere.push("1 = 0");
        else {
          const placeholders = candidates.map(() => "?").join(",");
          totalWhere.push(`(LOWER(TRIM(src.slug)) IN (${placeholders}) OR LOWER(TRIM(src.name)) IN (${placeholders}))`);
          totalParams.push(...candidates, ...candidates);
        }
      }
    }
    if (query) {
      totalWhere.push(`(su.title LIKE ? ESCAPE '\\\\' OR su.content LIKE ? ESCAPE '\\\\' OR su.detailed_content LIKE ? ESCAPE '\\\\')`);
      totalParams.push(...search.params);
    }
    if (today) {
      const bounds = businessDayBounds(new Date());
      totalWhere.push("su.created_at >= ? AND su.created_at < ?");
      totalParams.push(mysqlUtc(bounds.start), mysqlUtc(bounds.end));
    }
    const [totalRows] = await db.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM summaries su ${totalJoin} WHERE ${totalWhere.join(" AND ")}`,
      totalParams
    );

    return NextResponse.json({
      contract: "public-feed-v1",
      definition: "Publikálható AI-összefoglalók (ai_clean=1)",
      total: Number(totalRows[0]?.total || 0),
      sources: sourceRows.map((row) => ({ id: Number(row.id), slug: row.slug, name: row.name, count: Number(row.count) })),
      categories: categoryRows.map((row) => ({ name: row.category, count: Number(row.count) })),
    }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("API /feed-facets error:", error);
    return NextResponse.json({ error: "feed_facets_failed" }, { status: 500 });
  }
}
