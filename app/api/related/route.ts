import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { normalizeRelatedSource } from "@/lib/related-news";

let pool: mysql.Pool | null = null;

const RELATED_SOURCES = new Set([
  "telex", "24hu", "index", "hvg", "portfolio", "444", "origo",
]);

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const source = normalizeRelatedSource(searchParams.get("source"));
  const excludeId = Number(searchParams.get("exclude"));
  const requestedLimit = Number(searchParams.get("limit") ?? 5);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(20, Math.max(1, requestedLimit))
    : 5;

  if (!RELATED_SOURCES.has(source) || !Number.isSafeInteger(excludeId) || excludeId <= 0) {
    return NextResponse.json([]);
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
        AND (current_s.article_id IS NULL OR s.article_id != current_s.article_id)
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
      [excludeId, source, limit]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("RELATED API ERROR:", err);
    return NextResponse.json([]);
  }
}
