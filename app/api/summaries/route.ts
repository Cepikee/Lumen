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

    // 1) Több forrásos szűrés — DUPLIKÁCIÓMENTES PAGINÁLÁS
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

      return NextResponse.json(rows ?? []);
    }

    // 2) Mai nap szűrő
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
      return NextResponse.json(rows ?? []);
    }

    // 3) Normál paginált feed — FORRÁSONKÉNT 10 RANDOM MAI CIKK
    {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // 3.1) Mai cikkek lekérése
      const todayQuery = `
        SELECT 
          s.id,
          s.url,
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

      // 3.2) Csoportosítás forrás szerint
      const bySource: Record<number, any[]> = {};
      for (const row of todayRows) {
        if (!bySource[row.source_id]) bySource[row.source_id] = [];
        bySource[row.source_id].push(row);
      }

      // 3.3) Minden forrásból 10 random mai cikk
      let pool: any[] = [];

      for (const sourceId in bySource) {
        const list = bySource[sourceId];

        // ha kevesebb mint 10 van → mindet berakjuk
        if (list.length <= 10) {
          pool.push(...list);
        } else {
          // különben 10 randomot választunk
          const shuffled = [...list].sort(() => Math.random() - 0.5);
          pool.push(...shuffled.slice(0, 10));
        }
      }

      // 3.4) Végső random sorrend
      pool.sort(() => Math.random() - 0.5);

      // 3.5) Paginálás a random pool-ból
      const paginated = pool.slice(offset, offset + limit);

      return NextResponse.json(paginated);
    }

  } catch (err: any) {
    console.error("API /summaries hiba:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
