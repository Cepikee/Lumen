// app/api/insights/category/[category]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security"; // ⭐ központi védelem

function normalizeParam(raw?: string | null) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  try {
    if (s.includes("%25")) s = decodeURIComponent(decodeURIComponent(s));
    else if (s.includes("%")) s = decodeURIComponent(s);
  } catch {}

  s = s.trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

export async function GET(req: Request, context: any) {
  // ⭐ KÖZPONTI SECURITY CHECK
  const sec = await securityCheck(req);
  if (sec) return sec;

  const url = new URL(req.url);

  // Next 15/16 supplies dynamic route params as a Promise. Resolve it before
  // reading the category so the route does not emit a sync-dynamic-apis
  // warning (and does not silently fall back to parsing the URL path).
  const resolvedParams = context?.params && typeof context.params.then === "function"
    ? await context.params
    : context?.params;
  const rawFromContext = resolvedParams?.category;
  const rawFromPath = (url.pathname || "").split("/").filter(Boolean).pop();
  const raw = rawFromContext ?? rawFromPath ?? undefined;
  const categoryParam = normalizeParam(raw);

  const period = String(url.searchParams.get("period") || "7d");
  const sort = String(url.searchParams.get("sort") || "latest");
  if (!["7d", "30d", "90d"].includes(period)) {
    return NextResponse.json({ success: false, error: "invalid_period" }, { status: 400 });
  }
  if (!["latest", "popular"].includes(sort)) {
    return NextResponse.json({ success: false, error: "invalid_sort" }, { status: 400 });
  }
  const requestedPage = Number(url.searchParams.get("page") || 1);
  const requestedLimit = Number(url.searchParams.get("limit") || 20);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100_000 ? requestedPage : 1;
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(100, requestedLimit)
    : 20;
  const offset = (page - 1) * limit;

  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = new Date().toISOString().slice(0, 10);

  try {
    // ---------------------------------------
    // 1) Cikkek lekérdezése (page)
    // ---------------------------------------
    const itemsParams: any[] = [];
    let whereClause = "";

    if (categoryParam === null && raw !== undefined) {
      whereClause = ` WHERE a.category IS NULL`;
    } else if (categoryParam) {
      whereClause = ` WHERE LOWER(TRIM(a.category)) = LOWER(TRIM(?))`;
      itemsParams.push(categoryParam);
    }

    itemsParams.push(startDateStr, endDateStr);
    const periodClause = ` AND DATE(a.published_at) >= ? AND DATE(a.published_at) < ?`;

    // Keep pagination stable when multiple articles share the same timestamp
    // (or score). Without a unique tie-breaker rows can move between pages
    // across otherwise identical requests.
    let orderBy = "ORDER BY a.published_at DESC, a.id DESC";
    if (sort === "popular") {
      orderBy = "ORDER BY a.score DESC, a.published_at DESC, a.id DESC";
    }

    const itemsSql = `
      SELECT 
        a.id AS article_id,
        s.id AS summary_id,
        a.title,
        a.category,
        a.published_at,
        a.source AS dominantSource,
        1 AS sources,
        COALESCE(a.score, 0) AS score,
        CASE WHEN a.content_text IS NOT NULL THEN SUBSTRING(a.content_text, 1, 300) ELSE NULL END AS excerpt
      FROM articles a
      JOIN summaries s ON s.article_id = a.id
        AND NOT EXISTS (
          SELECT 1
          FROM summaries newer_s
          WHERE newer_s.article_id = s.article_id
            AND (
              newer_s.created_at > s.created_at
              OR (newer_s.created_at = s.created_at AND newer_s.id > s.id)
            )
        )
      ${whereClause}
      ${periodClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    itemsParams.push(limit, offset);

    const [itemsRows]: any = await db.query(itemsSql, itemsParams);

    const items = (itemsRows || []).map((r: any) => ({
      id: String(r.summary_id),
      title: r.title,
      category: r.category ?? null,
      published_at: (() => {
        if (!r.published_at) return null;
        const date = new Date(r.published_at);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      })(),
      dominantSource: r.dominantSource || "",
      sources: Number(r.sources || 1),
      score: Number(r.score || 0),
      excerpt: r.excerpt || "",
      href: `/cikk/${r.summary_id}`,
    }));

    // ---------------------------------------
    // 2) Aggregációk
    // ---------------------------------------
    const aggParams: any[] = [];
    let aggWhere = "";

    if (categoryParam === null && raw !== undefined) {
      aggWhere = ` WHERE a.category IS NULL`;
    } else if (categoryParam) {
      aggWhere = ` WHERE LOWER(TRIM(a.category)) = LOWER(TRIM(?))`;
      aggParams.push(categoryParam);
    }

    aggParams.push(startDateStr, endDateStr);

    const aggSql = `
      SELECT
        COUNT(DISTINCT a.id) AS articleCount,
        COUNT(DISTINCT NULLIF(LOWER(TRIM(a.source)), '')) AS sourceCount,
        MAX(a.published_at) AS lastUpdated
      FROM articles a
      JOIN summaries s ON s.article_id = a.id
        AND NOT EXISTS (
          SELECT 1
          FROM summaries newer_s
          WHERE newer_s.article_id = s.article_id
            AND (
              newer_s.created_at > s.created_at
              OR (newer_s.created_at = s.created_at AND newer_s.id > s.id)
            )
        )
      ${aggWhere}
      AND DATE(a.published_at) >= ? AND DATE(a.published_at) < ?
    `;

    const [aggRows]: any = await db.query(aggSql, aggParams);
    const agg = aggRows?.[0] || { articleCount: 0, sourceCount: 0, lastUpdated: null };

    // ---------------------------------------
    // 3) Forráslista
    // ---------------------------------------
    const srcParams: any[] = [];
    let srcWhere = "";

    if (categoryParam === null && raw !== undefined) {
      srcWhere = ` WHERE a.category IS NULL`;
    } else if (categoryParam) {
      srcWhere = ` WHERE LOWER(TRIM(a.category)) = LOWER(TRIM(?))`;
      srcParams.push(categoryParam);
    }

    srcParams.push(startDateStr, endDateStr);

    const srcSql = `
      SELECT COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen') AS source, COUNT(DISTINCT a.id) AS cnt
      FROM articles a
      JOIN summaries s ON s.article_id = a.id
        AND NOT EXISTS (
          SELECT 1
          FROM summaries newer_s
          WHERE newer_s.article_id = s.article_id
            AND (
              newer_s.created_at > s.created_at
              OR (newer_s.created_at = s.created_at AND newer_s.id > s.id)
            )
        )
      ${srcWhere}
      AND DATE(a.published_at) >= ? AND DATE(a.published_at) < ?
      GROUP BY COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen')
      ORDER BY cnt DESC, source ASC
      LIMIT 50
    `;

    const [srcRows]: any = await db.query(srcSql, srcParams);

    const sources = (srcRows || []).map((r: any) => ({
      source: r.source || "Ismeretlen",
      count: Number(r.cnt || 0),
    }));

    // 🔢 Gyűrű diagram adatok
    const totalSourceCount =
      sources.reduce((sum: number, s: { source: string; count: number }) => sum + (Number(s.count) || 0), 0) || 1;

    const ringSources = sources.map((s: { source: string; count: number }) => {
      const rawName = String(s.source || "");
      const normalized = rawName.toLowerCase().replace(".hu", "").trim();

      return {
        name: normalized,
        label: rawName || "Ismeretlen",
        count: s.count,
        percent: Math.round((Number(s.count) / totalSourceCount) * 100),
      };
    });

    // ---------------------------------------
    // 4) Trend sorozat
    // ---------------------------------------
    const trendParams: any[] = [];
    let trendWhere = "";

    if (categoryParam === null && raw !== undefined) {
      trendWhere = ` WHERE a.category IS NULL`;
    } else if (categoryParam) {
      trendWhere = ` WHERE LOWER(TRIM(a.category)) = LOWER(TRIM(?))`;
      trendParams.push(categoryParam);
    }

    trendParams.push(startDateStr, endDateStr);

    const trendSql = `
      SELECT DATE(a.published_at) AS day, COUNT(DISTINCT a.id) AS cnt
      FROM articles a
      JOIN summaries s ON s.article_id = a.id
        AND NOT EXISTS (
          SELECT 1
          FROM summaries newer_s
          WHERE newer_s.article_id = s.article_id
            AND (
              newer_s.created_at > s.created_at
              OR (newer_s.created_at = s.created_at AND newer_s.id > s.id)
            )
        )
      ${trendWhere}
      AND DATE(a.published_at) >= ? AND DATE(a.published_at) < ?
      GROUP BY DATE(a.published_at)
      ORDER BY DATE(a.published_at) ASC
    `;

    const [trendRows]: any = await db.query(trendSql, trendParams);

    const dayMap = new Map<string, number>();
    for (const r of trendRows || []) {
      const d = r.day ? String(r.day) : null;
      if (d) dayMap.set(d, Number(r.cnt || 0));
    }

    const labels: string[] = [];
    const series: number[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const label = d.toISOString().slice(0, 10);
      labels.push(label);
      series.push(dayMap.get(label) ?? 0);
    }

    const trendScore = series.reduce((s, v) => s + v, 0);

    // ---------------------------------------
    // 5) Válasz
    // ---------------------------------------
    const meta = {
      category: categoryParam ?? null,
      articleCount: Number(agg.articleCount || 0),
      sourceCount: Number(agg.sourceCount || 0),
      lastUpdated: (() => {
        if (!agg.lastUpdated) return null;
        const date = new Date(agg.lastUpdated);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      })(),
    };

    const summary = {
      trendSeries: series,
      trendLabels: labels,
      trendScore,
    };

    return NextResponse.json({
      success: true,
      meta,
      summary,
      items,
      sources,
      ringSources,
      page,
      limit,
      total: Number(agg.articleCount || 0),
    });

  } catch (err) {
    console.error("Category route hiba:", err);
    return NextResponse.json(
      { success: false, error: "szerver_hiba" },
      { status: 500 }
    );
  }
}
