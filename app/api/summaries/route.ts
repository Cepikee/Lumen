import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic";

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

// --- Fallback cím generálás (ha nincs AI title) --- //
function fallbackTitle(row: any): string {
  if (row.title && row.title.trim().length > 0) {
    return row.title.trim();
  }

  const slug = row.url?.split("/").pop() || "";
  const words = slug.split("-").filter((w: string) => w.length > 2);

  if (words.length >= 3) {
    return words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  const fallback = row.content?.split("\n")[0]?.trim() || "Cím nélkül";
  return fallback;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const todayFilter = searchParams.get("today") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));

    const limit = 10;
    const offset = (page - 1) * limit;

    const sourcesRaw = searchParams.getAll("source");
    const sources = sourcesRaw
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));

    const db = getPool();

    // --- 1) Több forrásos szűrés --- //
    if (sources.length > 0) {
      const placeholders = sources.map(() => "?").join(",");

      const idQuery = `
        SELECT s.id
        FROM summaries s
        LEFT JOIN articles a ON s.article_id = a.id
        WHERE a.source_id IN (${placeholders})
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [idRows] = await db.query<any[]>(idQuery, sources);
      const ids = idRows.map((r) => r.id);

      if (ids.length === 0) return NextResponse.json([]);

      const idPlaceholders = ids.map(() => "?").join(",");
      const orderField = ids.map(() => "?").join(",");

      const fullQuery = `
        SELECT 
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at
        FROM summaries s
        LEFT JOIN articles a ON s.article_id = a.id
        LEFT JOIN sources src ON a.source_id = src.id
        WHERE s.id IN (${idPlaceholders})
        ORDER BY FIELD(s.id, ${orderField})
      `;

      const params = [...ids, ...ids];
      const [rows] = await db.query<any[]>(fullQuery, params);

      const finalRows = rows.map((r) => ({
        ...r,
        title: fallbackTitle(r),
      }));

      return NextResponse.json(finalRows ?? []);
    }

    // --- 2) Mai nap szűrő --- //
    if (todayFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayQuery = `
        SELECT 
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
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

      const [rows] = await db.query<any[]>(todayQuery, [today, tomorrow]);

      const finalRows = rows.map((r) => ({
        ...r,
        title: fallbackTitle(r),
      }));

      return NextResponse.json(finalRows ?? []);
    }

    // --- 3) Normál paginált feed (LEGFRISSEBB ELŐL) --- //
    {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayQuery = `
        SELECT 
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
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

      const [todayRows] = await db.query<any[]>(todayQuery, [today, tomorrow]);

      const bySource: Record<number, any[]> = {};
      for (const row of todayRows) {
        if (!bySource[row.source_id]) bySource[row.source_id] = [];
        bySource[row.source_id].push(row);
      }

      let pool: any[] = [];

      for (const sourceId in bySource) {
        const list = bySource[sourceId];

        const sorted = [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        pool.push(...sorted.slice(0, 10));
      }

      pool.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const paginated = pool.slice(offset, offset + limit);

      const finalRows = paginated.map((r) => ({
        ...r,
        title: fallbackTitle(r),
      }));

      return NextResponse.json(finalRows);
    }

  } catch (err: any) {
    console.error("API /summaries hiba:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
