// app/api/insights/category/[category]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Normalizáló segédfüggvény
 * - trimeli a bemenetet
 * - kezeli az egyszeres és dupla URL-enkódolást (pl. %C3%A1 vagy %25C3%25A1)
 * - üres / "null" stringet null-ként kezeli
 */
function normalizeParam(raw?: string | null) {
  if (raw === undefined || raw === null) return null;

  let s = String(raw).trim();
  if (!s) return null;

  try {
    // Ha dupla enkódolás jele (%25) van, próbáljuk meg kétszer dekódolni
    if (s.includes("%25")) {
      s = decodeURIComponent(decodeURIComponent(s));
    } else if (s.includes("%")) {
      // egyszeres enkódolás
      s = decodeURIComponent(s);
    }
  } catch (e) {
    // ha a dekódolás meghiúsul, marad az eredeti string (trim után)
  }

  s = s.trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

export async function GET(req: Request, context: any) {
  // próbáljuk meg a kategóriát több forrásból kinyerni (context.params vagy URL path)
  const url = new URL(req.url);
  const rawFromContext = context?.params?.category;
  const rawFromPath = (url.pathname || "").split("/").filter(Boolean).pop();
  const raw = rawFromContext ?? rawFromPath ?? undefined;

  // normalizáljuk és dekódoljuk a paramétert
  const categoryParam = normalizeParam(raw);

  // query paramok
  const period = String(url.searchParams.get("period") || "7d");
  const sort = String(url.searchParams.get("sort") || "latest");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const offset = (page - 1) * limit;

  // periódus napokban
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  // kezdő dátum: csak a YYYY-MM-DD részt használjuk (MySQL DATE összehasonlításhoz)
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  const startDateStr = startDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  try {
    // -------------------------
    // 1) Cikkek lekérdezése (page)
    // -------------------------
    const itemsParams: any[] = [];
    let whereClause = "";

    if (categoryParam === null && raw !== undefined) {
      // explicit "null" paraméter: category IS NULL
      whereClause = ` WHERE category IS NULL`;
    } else if (categoryParam) {
      whereClause = ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      itemsParams.push(categoryParam);
    }

    // periódus feltétel (DATE alapú)
    itemsParams.push(startDateStr);
    const periodClause = `${whereClause ? " AND" : " WHERE"} DATE(published_at) >= ?`;

    // rendezés (egyszerű, jelenleg csak published_at)
    const orderBy = "ORDER BY published_at DESC";

    // content_text-ből rövid kivonat (ha van), ha nincs, NULL
    const itemsSql = `
      SELECT id, title, category, published_at, source AS dominantSource,
             1 AS sources, 0 AS score, 
             CASE WHEN content_text IS NOT NULL THEN SUBSTRING(content_text, 1, 300) ELSE NULL END AS excerpt
      FROM articles
      ${whereClause}
      ${periodClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    itemsParams.push(limit, offset);

    const [itemsRows]: any = await db.query(itemsSql, itemsParams);

    const items = (itemsRows || []).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: r.category ?? null,
      published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
      dominantSource: r.dominantSource || "",
      sources: Number(r.sources || 1),
      score: Number(r.score || 0),
      excerpt: r.excerpt || "",
      href: `/insights/${r.id}`,
    }));

    // -------------------------
    // 2) Aggregációk (összes cikk, források száma, utolsó frissítés)
    // -------------------------
    const aggParams: any[] = [];
    let aggWhere = "";
    if (categoryParam === null && raw !== undefined) {
      aggWhere = ` WHERE category IS NULL`;
    } else if (categoryParam) {
      aggWhere = ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      aggParams.push(categoryParam);
    }
    aggParams.push(startDateStr);

    const aggSql = `
      SELECT
        COUNT(*) AS articleCount,
        COUNT(DISTINCT source) AS sourceCount,
        MAX(published_at) AS lastUpdated
      FROM articles
      ${aggWhere}
      AND DATE(published_at) >= ?
    `;
    const [aggRows]: any = await db.query(aggSql, aggParams);
    const agg = (aggRows && aggRows[0]) || { articleCount: 0, sourceCount: 0, lastUpdated: null };

    // -------------------------
    // 3) Trend sorozat (naponkénti darabszám)
    // -------------------------
    const trendParams: any[] = [];
    let trendWhere = "";
    if (categoryParam === null && raw !== undefined) {
      trendWhere = ` WHERE category IS NULL`;
    } else if (categoryParam) {
      trendWhere = ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      trendParams.push(categoryParam);
    }
    trendParams.push(startDateStr);

    const trendSql = `
      SELECT DATE(published_at) AS day, COUNT(*) AS cnt
      FROM articles
      ${trendWhere}
      AND DATE(published_at) >= ?
      GROUP BY DATE(published_at)
      ORDER BY DATE(published_at) ASC
    `;
    const [trendRows]: any = await db.query(trendSql, trendParams);

    const dayMap = new Map<string, number>();
    for (const r of (trendRows || [])) {
      const d = r.day ? String(r.day) : null; // YYYY-MM-DD
      if (d) dayMap.set(d, Number(r.cnt || 0));
    }

    const labels: string[] = [];
    const series: number[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const label = d.toISOString().slice(0, 10); // YYYY-MM-DD
      labels.push(label);
      series.push(dayMap.get(label) ?? 0);
    }

    const trendScore = series.reduce((s, v) => s + v, 0);

    // -------------------------
    // 4) Válasz összeállítása
    // -------------------------
    const meta = {
      category: categoryParam ?? null,
      articleCount: Number(agg.articleCount || 0),
      sourceCount: Number(agg.sourceCount || 0),
      lastUpdated: agg.lastUpdated ? new Date(agg.lastUpdated).toISOString() : null,
    };

    const summary = {
      trendSeries: series,
      trendLabels: labels,
      trendScore: Number(trendScore || 0),
    };

    const pageInfo = {
      page,
      limit,
      total: Number(agg.articleCount || 0),
    };

    return NextResponse.json({
      success: true,
      meta,
      summary,
      items,
      ...pageInfo,
    });
  } catch (err: any) {
    console.error("Category route hiba:", err);
    return NextResponse.json(
      { success: false, error: "szerver_hiba" },
      { status: 500 }
    );
  }
}
