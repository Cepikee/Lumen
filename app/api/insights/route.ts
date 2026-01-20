// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Próbáljuk meg javítani a mojibake-ot és normalizálni a kategória stringeket
 * anélkül, hogy az adatbázist módosítanánk.
 */
function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;

  // Próbálkozás a gyakori double-encoding javítására:
  // ha a stringben látható a mojibake (pl. "k├âz..."), akkor konvertáljuk latin1->utf8
  const hasMojibake = /[├â├ę├╝├║]/.test(t);
  if (hasMojibake) {
    try {
      // Buffer.from(t, 'binary') lehet hasznos, de leggyakoribb javítás:
      t = Buffer.from(t, "latin1").toString("utf8");
    } catch (e) {
      // ha nem sikerül, marad az eredeti
    }
  }

  return t || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawCategory = url.searchParams.get("category");
  const categoryParam = rawCategory ? String(rawCategory).trim() : null;

  try {
    // Lekérdezzük az articles-okat (read-only)
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

    const sql = `
      SELECT id, title, category, published_at, source AS dominantSource
      FROM articles
      ${where}
      ORDER BY published_at DESC
      LIMIT 1000
    `;
    const [rows]: any = await db.query(sql, params);

    // Aggregáljuk a kategóriákat a JS oldalon: normalizálás + számlálás
    const catMap = new Map<string, {
      category: string | null;
      trendScore: number;
      articleCount: number;
      sourceDiversity: number;
      lastArticleAt: string | null;
    }>();

    for (const r of (rows || [])) {
      const raw = r.category ?? null;
      const cat = normalizeDbString(raw);
      const key = cat ?? "__NULL__";

      const publishedAt = r.published_at ? new Date(r.published_at).toISOString() : null;
      const dominantSource = r.dominantSource ? String(r.dominantSource) : "";

      if (!catMap.has(key)) {
        catMap.set(key, {
          category: cat,
          trendScore: 0, // placeholder, nincs számított score a DB-ből
          articleCount: 0,
          sourceDiversity: 0,
          lastArticleAt: publishedAt,
        });
      }
      const entry = catMap.get(key)!;
      entry.articleCount += 1;
      // egyszerű sourceDiversity: ha van dominantSource, növeljük (helyettesítő logika)
      if (dominantSource) entry.sourceDiversity += 1;
      // frissítsük a legutolsó dátumot
      if (publishedAt && (!entry.lastArticleAt || publishedAt > entry.lastArticleAt)) {
        entry.lastArticleAt = publishedAt;
      }
    }

    // Átalakítjuk tömbbé, trendScore-et egyszerűen articleCount alapján állítjuk be
    const categories = Array.from(catMap.values())
      .map((e) => ({
        category: e.category,
        trendScore: Math.round(e.articleCount), // egyszerű helyettesítő score
        articleCount: e.articleCount,
        sourceDiversity: e.sourceDiversity,
        lastArticleAt: e.lastArticleAt,
      }))
      .sort((a, b) => b.articleCount - a.articleCount);

    // Ha nincs találat a fenti lekérdezésből, próbáljunk meg visszaadni a DB-ből egy általános listát (read-only)
    if (categories.length === 0) {
      const [catsRows]: any = await db.query(
        `SELECT LOWER(TRIM(category)) AS cat_norm, COUNT(*) AS cnt
         FROM articles
         GROUP BY LOWER(TRIM(category))
         ORDER BY cnt DESC
         LIMIT 200`
      );
      const fallback = (catsRows || []).map((c: any) => ({
        category: normalizeDbString(c.cat_norm),
        trendScore: Number(c.cnt || 0),
        articleCount: Number(c.cnt || 0),
        sourceDiversity: 0,
        lastArticleAt: null,
      }));
      return NextResponse.json({ success: true, items: [], categories: fallback });
    }

    // Visszaadjuk az items-et is (például a legfrissebb cikkek)
    const items = (rows || []).slice(0, 200).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: normalizeDbString(r.category),
      timeAgo: r.published_at ? new Date(r.published_at).toISOString() : null,
      dominantSource: r.dominantSource || "",
      sources: 1,
      score: 0,
      href: normalizeDbString(r.category) ? `/insights/category/${encodeURIComponent(normalizeDbString(r.category)!)}` : `/insights/${r.id}`,
    }));

    return NextResponse.json({ success: true, items, categories });
  } catch (err) {
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
