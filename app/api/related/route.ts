import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const source = searchParams.get("source");
  const excludeId = Number(searchParams.get("exclude"));
  const limit = Number(searchParams.get("limit") ?? 5);

  if (!source || !excludeId) {
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
      WHERE src.name LIKE CONCAT('%', ?, '%')
        AND s.id != ?
      ORDER BY s.created_at DESC
      LIMIT ?
      `,
      [source, excludeId, limit]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("RELATED API ERROR:", err);
    return NextResponse.json([]);
  }
}
