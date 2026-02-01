// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Normalizáljuk a DB-ből jövő stringeket (mojibake fix)
 */
function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;

  const hasMojibake = /[├â├ę├╝├║]/.test(t);
  if (hasMojibake) {
    try {
      t = Buffer.from(t, "latin1").toString("utf8");
    } catch {}
  }
  return t || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // period paraméter
  const period = url.searchParams.get("period") || "7d";
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  // kezdő dátum
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  const startDateStr = startDate.toISOString().slice(0, 10);

  // opcionális category filter
  const rawCategory = url.searchParams.get("category");
  const categoryParam = rawCategory ? String(rawCategory).trim() : null;

  try {
    // ---------------------------------------------------------
    // 1) LEKÉRDEZZÜK AZ ÖSSZES KATEGÓRIÁT A DB-BŐL
    // ---------------------------------------------------------
    const [allCats]: any = await db.query(`
      SELECT DISTINCT LOWER(TRIM(category)) AS category
      FROM articles
      WHERE category IS NOT NULL AND category <> ''
    `);

    const catMap = new Map<
      string,
      {
        category: string | null;
        trendScore: number;
        articleCount: number;
        sourceSet: Set<string>;
        lastArticleAt: string | null;
        sourceCounts: Map<string, number>;
      }
    >();

    for (const c of allCats) {
      const cat = normalizeDbString(c.category);
      const key = cat ?? "__NULL__";

      catMap.set(key, {
        category: cat,
        trendScore: 0,
        articleCount: 0,
        sourceSet: new Set(),
        lastArticleAt: null,
        sourceCounts: new Map(),
      });
    }

    // ---------------------------------------------------------
    // 2) CIKKEK LEKÉRDEZÉSE (IDŐSZAK + OPCIONÁLIS KATEGÓRIA)
    // ---------------------------------------------------------
    const params: any[] = [];
    let where = "";

    if (categoryParam !== null && categoryParam !== "") {
      if (categoryParam.toLowerCase() === "null") {
        where = ` WHERE category IS NULL`;
      } else {
        where = ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
        params.push(categoryParam);
      }
    }

    params.push(startDateStr);
    const periodClause = `${where ? " AND" : " WHERE"} DATE(published_at) >= ?`;

    const sql = `
      SELECT id, title, category, published_at, source AS dominantSource
      FROM articles
      ${where}
      ${periodClause}
      ORDER BY published_at DESC
    `;

    const [rows]: any = await db.query(sql, params);

    // ---------------------------------------------------------
    // 3) AGGREGÁCIÓ FELTÖLTÉSE
    // ---------------------------------------------------------
    for (const r of rows || []) {
      const raw = r.category ?? null;
      const cat = normalizeDbString(raw);
      const key = cat ?? "__NULL__";

      const entry = catMap.get(key);
      if (!entry) continue;

      const publishedAt = r.published_at
        ? new Date(r.published_at).toISOString()
        : null;

      const dominantSource = r.dominantSource
        ? String(r.dominantSource).trim()
        : "Ismeretlen";

      entry.articleCount += 1;
      entry.sourceSet.add(dominantSource);

      entry.sourceCounts.set(
        dominantSource,
        (entry.sourceCounts.get(dominantSource) || 0) + 1
      );

      if (publishedAt && (!entry.lastArticleAt || publishedAt > entry.lastArticleAt)) {
        entry.lastArticleAt = publishedAt;
      }
    }

    // ---------------------------------------------------------
    // 4) KATEGÓRIA LISTA ÖSSZEÁLLÍTÁSA
    // ---------------------------------------------------------
    const categories = Array.from(catMap.values())
      .map((e) => {
        const total = Array.from(e.sourceCounts.values()).reduce(
          (sum, c) => sum + c,
          0
        );

        const ringSources = Array.from(e.sourceCounts.entries()).map(
          ([label, count]) => {
            const normalized = label.toLowerCase().replace(".hu", "").trim();
            return {
              name: normalized,
              label,
              count,
              percent: total > 0 ? Math.round((count / total) * 100) : 0,
            };
          }
        );

        return {
          category: e.category,
          trendScore: e.articleCount,
          articleCount: e.articleCount,
          sourceDiversity: e.sourceSet.size,
          lastArticleAt: e.lastArticleAt,
          ringSources,
        };
      })
      .sort((a, b) => b.articleCount - a.articleCount);

    // ---------------------------------------------------------
    // 5) LEGFRISSEBB CIKKEK
    // ---------------------------------------------------------
    const items = (rows || []).slice(0, 200).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: normalizeDbString(r.category),
      timeAgo: r.published_at
        ? new Date(r.published_at).toISOString()
        : null,
      dominantSource: r.dominantSource || "",
      sources: 1,
      score: 0,
      href: normalizeDbString(r.category)
        ? `/insights/category/${encodeURIComponent(
            normalizeDbString(r.category)!
          )}`
        : `/insights/${r.id}`,
    }));

    return NextResponse.json({
      success: true,
      period,
      categories,
      items,
    });
  } catch (err) {
    console.error("Insights route error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
