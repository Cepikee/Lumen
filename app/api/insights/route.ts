// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function cleanCategory(s: any): string | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const period = url.searchParams.get("period") || "7d";
  let days = period === "30d" ? 30 : period === "90d" ? 90 : 7;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  const startDateStr = startDate.toISOString().slice(0, 10);

  const rawCategory = url.searchParams.get("category");
  const categoryParam = rawCategory ? rawCategory.trim() : null;

  try {
    // 1) ÖSSZES KATEGÓRIA LEKÉRÉSE
    const [allCats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM articles
      WHERE category IS NOT NULL AND category <> ''
    `);

    const catMap = new Map<
      string,
      {
        category: string;
        trendScore: number;
        articleCount: number;
        sourceSet: Set<string>;
        lastArticleAt: string | null;
        sourceCounts: Map<string, number>;
      }
    >();

    for (const c of allCats) {
      const cat = cleanCategory(c.category);
      if (!cat) continue;

      catMap.set(cat, {
        category: cat,
        trendScore: 0,
        articleCount: 0,
        sourceSet: new Set(),
        lastArticleAt: null,
        sourceCounts: new Map(),
      });
    }

    // 2) CIKKEK LEKÉRÉSE
    const params: any[] = [];
    let where = "";

    if (categoryParam) {
      where = ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      params.push(categoryParam);
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

    // 3) AGGREGÁCIÓ FELTÖLTÉSE
    for (const r of rows) {
      const cat = cleanCategory(r.category);
      if (!cat) continue;

      const entry = catMap.get(cat);
      if (!entry) continue;

      const publishedAt = r.published_at
        ? new Date(r.published_at).toISOString()
        : null;

      const dominantSource = r.dominantSource
        ? String(r.dominantSource).trim()
        : "Ismeretlen";

      entry.articleCount++;
      entry.sourceSet.add(dominantSource);

      entry.sourceCounts.set(
        dominantSource,
        (entry.sourceCounts.get(dominantSource) || 0) + 1
      );

      if (publishedAt && (!entry.lastArticleAt || publishedAt > entry.lastArticleAt)) {
        entry.lastArticleAt = publishedAt;
      }
    }

    // 4) KATEGÓRIA LISTA
    const categories = Array.from(catMap.values())
      .map((e) => {
        const total = Array.from(e.sourceCounts.values()).reduce(
          (sum, c) => sum + c,
          0
        );

        const ringSources = Array.from(e.sourceCounts.entries()).map(
          ([label, count]) => ({
            name: label.toLowerCase().replace(".hu", "").trim(),
            label,
            count,
            percent: total > 0 ? Math.round((count / total) * 100) : 0,
          })
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

    // 5) LEGFRISSEBB CIKKEK
    const items = rows.slice(0, 200).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: cleanCategory(r.category),
      timeAgo: r.published_at
        ? new Date(r.published_at).toISOString()
        : null,
      dominantSource: r.dominantSource || "",
      sources: 1,
      score: 0,
      href: cleanCategory(r.category)
        ? `/insights/category/${encodeURIComponent(cleanCategory(r.category)!)}`
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
