import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const todayFilter = searchParams.get("today") === "true";
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 20);
    const offset = (page - 1) * limit;

    // 🔥 Több forrás támogatása
    const sources = searchParams.getAll("source");

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    // 🔥 1) Több forrásos szűrés (EZ LEGYEN ELŐL!)
    if (sources.length > 0) {
      const placeholders = sources.map(() => "?").join(",");
      const query = `
        SELECT 
          s.id,
          s.url,
          s.language,
          src.name AS source,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at
        FROM summaries s
        LEFT JOIN articles a ON s.article_id = a.id
        LEFT JOIN sources src ON a.source_id = src.id
        WHERE src.name IN (${placeholders})
        ORDER BY s.created_at DESC
      `;

      const [rows] = await connection.execute<RowDataPacket[]>(query, sources);
      await connection.end();
      return NextResponse.json(rows ?? []);
    }

    // 🔥 2) Mai nap szűrő
    if (todayFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayQuery = `
        SELECT 
          s.id,
          s.url,
          s.language,
          src.name AS source,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at
        FROM summaries s
        LEFT JOIN articles a ON s.article_id = a.id
        LEFT JOIN sources src ON a.source_id = src.id
        WHERE s.created_at >= ? AND s.created_at < ?
        ORDER BY s.created_at DESC
      `;

      const [todayRows] = await connection.execute<RowDataPacket[]>(todayQuery, [
        today,
        tomorrow
      ]);

      await connection.end();
      return NextResponse.json(todayRows ?? []);
    }

    // 🔥 3) Normál paginált feed
    const query = `
      SELECT 
        s.id,
        s.url,
        s.language,
        src.name AS source,
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
