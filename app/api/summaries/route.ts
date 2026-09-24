import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const dynamic = "force-dynamic";

let pool: mysql.Pool | null = null;
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

// --- ID → source név mapping (frontend ID-t küld!) --- //
const ID_TO_SOURCE_NAME: Record<string, string> = {
  "1": "telex",
  "2": "24hu",
  "3": "index",
  "4": "hvg",
  "5": "portfolio",
  "6": "444",
  "7": "origo",
};

// --- Forrásnév → source_id mapping (backend JOIN-hoz) --- //
const SOURCE_NAME_TO_ID: Record<string, number> = {
  telex: 1,
  "24hu": 2,
  index: 3,
  hvg: 4,
  portfolio: 5,
  "444": 6,
  origo: 7,
};

// --- Fallback cím generálás --- //
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
    const db = getPool();

    // ---------------------------------------------------------
    // 🔥 0) ID ALAPÚ LEKÉRDEZÉS (Cikkoldal)
    // ---------------------------------------------------------
    const idParam = searchParams.get("id");
    if (idParam) {
      const id = Number(idParam);

      const query = `
        SELECT 
          s.id,
          s.url,
          s.title,
          s.language,
          src.id AS source_id,
          src.name AS source_name,
          a.source AS source,
          s.content,
          s.detailed_content,
          s.category,
          s.plagiarism_score,
          s.ai_clean,
          s.created_at,
          s.trend_keywords
        FROM summaries s
        LEFT JOIN articles a ON s.article_id = a.id
        LEFT JOIN sources src ON a.source_id = src.id
        WHERE s.id = ?
        LIMIT 1
      `;

      const [rows] = await db.query<any[]>(query, [id]);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "Cikk nem található." }, { status: 404 });
      }

      const row = rows[0];

      return NextResponse.json({
        ...row,
        title: fallbackTitle(row),
        keywords: row.trend_keywords
          ? row.trend_keywords.split(",").map((k: string) => k.trim())
          : [],
      });
    }

    // ---------------------------------------------------------
    // 🔥 1) Paraméterek beolvasása
    // ---------------------------------------------------------
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 10;
    const offset = (page - 1) * limit;

    // --- Keresés ---
    const q = searchParams.get("q")?.trim() ?? "";
    let searchCondition = "";
    if (q) {
      const safe = q.replace(/'/g, "''");
      searchCondition = `
        AND (
          s.title LIKE '%${safe}%'
          OR s.content LIKE '%${safe}%'
          OR s.detailed_content LIKE '%${safe}%'
        )
      `;
    }

    // --- Források ---
    const sourcesRaw = searchParams.getAll("source");

    const normalizedSources = sourcesRaw
      .map((s) => {
        if (ID_TO_SOURCE_NAME[s]) return ID_TO_SOURCE_NAME[s];
        return s.toLowerCase().replace(".hu", "").replace(/\./g, "");
      })
      .filter((s) => s !== "");

    const sourceIds = normalizedSources
      .map((s) => SOURCE_NAME_TO_ID[s])
      .filter((id) => id !== undefined);

    // --- Kategóriák ---
    const categories = searchParams.getAll("category");

    // ---------------------------------------------------------
    // 🔥 2) Kombinált szűrés (FORRÁS + KATEGÓRIA) — AND logika
    // ---------------------------------------------------------
    if (sourceIds.length > 0 || categories.length > 0) {
      const whereParts: string[] = [];
      const params: any[] = [];

      if (sourceIds.length > 0) {
        whereParts.push(`a.source_id IN (${sourceIds.map(() => "?").join(",")})`);
        params.push(...sourceIds);
      }

      if (categories.length > 0) {
        whereParts.push(`s.category IN (${categories.map(() => "?").join(",")})`);
        params.push(...categories);
      }

      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

      const query = `
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
        ${whereClause}
        ${searchCondition}   -- 🔥 KERESÉS HOZZÁADVA
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const [rows] = await db.query<any[]>(query, params);

      const finalRows = rows.map((r) => ({
        ...r,
        title: fallbackTitle(r),
      }));

      return NextResponse.json(finalRows ?? []);
    }

    // ---------------------------------------------------------
    // 🔥 3) Mai nap szűrő
    // ---------------------------------------------------------
    const todayFilter = searchParams.get("today") === "true";
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
        ${searchCondition}   -- 🔥 KERESÉS HOZZÁADVA
        ORDER BY s.created_at DESC
      `;

      const [rows] = await db.query<any[]>(todayQuery, [today, tomorrow]);

      const finalRows = rows.map((r) => ({
        ...r,
        title: fallbackTitle(r),
      }));

      return NextResponse.json(finalRows ?? []);
    }

    // ---------------------------------------------------------
    // 🔥 4) Normál paginált feed + keresés
    // ---------------------------------------------------------
    {
      const query = `
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
        WHERE 1=1
        ${searchCondition}   -- 🔥 KERESÉS HOZZÁADVA
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await db.query<any[]>(query, [limit, offset]);

      const finalRows = rows.map((r) => ({
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
