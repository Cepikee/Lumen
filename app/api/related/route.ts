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
      SELECT id, title, url, source, created_at
      FROM summaries
      WHERE source LIKE CONCAT('%', ?, '%')
        AND id != ?
      ORDER BY created_at DESC
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
