import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 20);

    const offset = (page - 1) * limit;

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    // IMPORTANT: LIMIT és OFFSET NEM LEHET PARAMÉTER
    const query = `
      SELECT id, url, language, source, content, detailed_content, category, plagiarism_score, ai_clean, created_at
      FROM summaries
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await connection.execute<RowDataPacket[]>(query);

    await connection.end();

    return NextResponse.json(rows ?? []);
  } catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "Ismeretlen hiba történt";
  console.error("API /summaries hiba:", message);
  return NextResponse.json({ error: message }, { status: 500 });
}
}
