import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic";

// 🔥 Ugyanaz a globális pool, mint a summaries-ben
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

export async function GET() {
  try {
    const db = getPool();

    const [rows] = await db.query(`
      SELECT id, name
      FROM sources
      ORDER BY name ASC
    `);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("API /sources error:", err);
    return NextResponse.json({ error: "Hiba történt" }, { status: 500 });
  }
}
