import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    // Explicit típus: RowDataPacket[]
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
      SELECT id, url, language, content, detailed_content, category, plagiarism_score, ai_clean, created_at
      FROM summaries
      ORDER BY created_at DESC
      LIMIT 50
      `
    );

    await connection.end();
    return NextResponse.json(rows ?? []);
  } catch (err: any) {
    console.error("API /summaries hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
