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

    const query = `
      SELECT 
        s.id,
        s.url,
        s.language,
        src.name AS source,   -- <<< EZ A LÉNYEG
        s.content,
        s.detailed_content,
        s.category,
        s.plagiarism_score,
        s.ai_clean,
        s.created_at
      FROM summaries s
      LEFT JOIN articles a ON s.article_id = a.id
      LEFT JOIN sources src ON a.source_id = src.id
      ORDER BY s.created_at DESC
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
