// app/api/insights/category/[category]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Normalizáló segédfüggvény
 * - trimeli a bemenetet
 * - üres / "null" stringet null-ként kezeli
 */
function normalizeParam(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

export async function GET(req: Request, context: any) {
  const raw = context?.params?.category;
  const categoryParam = normalizeParam(raw);

  // query paramok
  const url = new URL(req.url);
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
    // --- DEBUG: log a hívás paramétereit (ideiglenes) ---
    console.log("API /api/insights/category/:category hívás", {
      raw,
      categoryParam,
      period,
      sort,
      page,
      limit,
      startDateStr,
    });

    // -------------------------
    // 1) Cikkek lekérdezése (page)
    // -------------------------
    const itemsParams: any[] = [];
    let whereClause = "";

    if (categoryParam === null && raw !== undefined) {
      whereClause = ` WHERE category IS NULL`;
    } else if (categoryParam) {
      whereClause = ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      itemsParams.push(categoryParam);
    }

    // használjuk a DATE(published_at) >= ? feltételt (egyszerűbb és megbízható)
    itemsParams.push(startDateStr);
    const periodClause = `${whereClause ? " AND" : " WHERE"} DATE(published_at) >= ?`;

    const orderBy =
      sort === "popular"
        ? "ORDER BY COALESCE(sources_count, 1) DESC, published_at DESC"
        : "ORDER BY published_at DESC";

    const itemsSql = `
      SELECT id, title, category, published_at, source AS dominantSource,
             COALESCE(sources_count, 1) AS sources, COALESCE(score, 0) AS score, excerpt
      FROM articles
      ${whereClause}
      ${periodClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    itemsParams.push(limit, offset);

    // DEBUG: log SQL és paraméterek
    console.log("itemsSql:", itemsSql);
    console.log("itemsParams:", itemsParams);

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
    console.log("aggSql:", aggSql);
    console.log("aggParams:", aggParams);
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
    console.log("trendSql:", trendSql);
    console.log("trendParams:", trendParams);
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
      // debug mező ideiglenesen: ha kell, láthatod a visszaadott SQL eredményt
      debug: { itemsCount: items.length },
    });
  } catch (err: any) {
    // ideiglenes részletes hibaüzenet (teszteléshez)
    console.error("Category route hiba:", err);
    return NextResponse.json(
      { success: false, error: "szerver_hiba", debug: String(err) },
      { status: 500 }
    );
  }
}
