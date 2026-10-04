import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { normalizeRelatedSource } from "@/lib/related-news";
import { adaptOptionalRelatedProjection } from "@/lib/v2/runtime-related-news";

let pool: mysql.Pool | null = null;

const RELATED_SOURCES = new Set([
  // normalizeRelatedSource() returns canonical source identities (for
  // example `telex` and `telex.hu` both become `telex.hu`).  Keeping the
  // allow-list in that same canonical form prevents valid article-detail
  // requests from being rejected with 400 before the query runs.
  "telex.hu", "24.hu", "index.hu", "hvg.hu", "portfolio.hu", "444.hu", "origo.hu",
]);

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const source = normalizeRelatedSource(searchParams.get("source"));
  const sourceSqlKey = source.replace(/[.\s]/g, "");
  const excludeId = Number(searchParams.get("exclude"));
  const requestedLimit = Number(searchParams.get("limit") ?? 5);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(20, Math.max(1, requestedLimit))
    : 5;

  if (!RELATED_SOURCES.has(source) || !Number.isSafeInteger(excludeId) || excludeId <= 0) {
    return NextResponse.json(
      { error: "invalid_related_parameters" },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT 
        s.id,
        s.title,
        s.url,
        s.created_at,
        s.source,
        src.name AS source_name,
        src.id AS source_id
      FROM summaries s
      LEFT JOIN articles a ON s.article_id = a.id
      LEFT JOIN sources src ON a.source_id = src.id
      INNER JOIN summaries current_s ON current_s.id = ?
      LEFT JOIN articles current_a ON current_s.article_id = current_a.id
      WHERE s.id != current_s.id
        AND s.article_id IS NOT NULL
        -- A disabled canonical source must not leak back into related news.
        -- Keep orphaned/source-less rows eligible because legacy summaries
        -- can still carry a usable source label without a source FK.
        AND (src.id IS NULL OR src.is_active = 1)
        AND (current_s.article_id IS NULL OR s.article_id != current_s.article_id)
        AND NOT EXISTS (
          SELECT 1
          FROM summaries newer_s
          WHERE newer_s.article_id = s.article_id
            AND (
              newer_s.created_at > s.created_at
              OR (newer_s.created_at = s.created_at AND newer_s.id > s.id)
            )
        )
        AND s.created_at BETWEEN current_s.created_at - INTERVAL 7 DAY
                             AND current_s.created_at + INTERVAL 7 DAY
        AND (
          (current_a.cluster_id IS NOT NULL AND a.cluster_id = current_a.cluster_id)
          OR LOWER(REPLACE(REPLACE(COALESCE(src.name, s.source, ''), '.', ''), ' ', '')) = ?
        )
      ORDER BY
        CASE WHEN current_a.cluster_id IS NOT NULL AND a.cluster_id = current_a.cluster_id THEN 0 ELSE 1 END,
        s.created_at DESC,
        s.id DESC
      LIMIT ?
      `,
      [excludeId, sourceSqlKey, limit]
    );

    // The legacy array remains the public response. When V2 is enabled, the
    // already-stable result is transformed once for the additive projection;
    // no second query, ranking pass or legacy mutation is performed here.
    adaptOptionalRelatedProjection(
      { currentSummaryId: excludeId, rows },
      { logger: (event: { event?: string; error?: string }) => console.warn("RELATED V2 PROJECTION:", event) },
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("RELATED API ERROR:", err);
    return NextResponse.json({ error: "related_query_failed" }, { status: 500 });
  }
}
