// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  const period = url.searchParams.get("period") || "7d";

  // --- mód kiválasztása ---
  let mode: "days" | "hours" = "days";
  let days = 7;
  let hours = 24;

  if (period === "24h") {
    mode = "hours";
  } else if (period === "30d") {
    days = 30;
  } else if (period === "90d") {
    days = 90;
  }

  // --- időintervallum ---
  const now = new Date();
  let start: Date;

  if (mode === "hours") {
    start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
  }

  const startStr = start.toISOString().slice(0, 19).replace("T", " ");


  // --- category filter ---
  const rawCategory = url.searchParams.get("category");
  const categoryParam = rawCategory ? String(rawCategory).trim() : null;

  try {
    // -----------------------------------------
    // 1) Cikkek lekérdezése
    // -----------------------------------------
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

    params.push(startStr);

    const periodClause =
      mode === "hours"
        ? `${where ? " AND" : " WHERE"} published_at >= ?`
        : `${where ? " AND" : " WHERE"} published_at >= ?
`;

    const sql = `
      SELECT id, title, category, published_at, source AS dominantSource
      FROM articles
      ${where}
      ${periodClause}
      ORDER BY published_at DESC
    `;

    const [rows]: any = await db.query(sql, params);

    // -----------------------------------------
    // 2) Kategória aggregáció + sparkline előkészítés
    // -----------------------------------------
    const catMap = new Map<
      string,
      {
        category: string | null;
        articleCount: number;
        sourceSet: Set<string>;
        lastArticleAt: string | null;
        sourceCounts: Map<string, number>;
        sparkBuckets: Map<string, number>; // ÚJ
      }
    >();

    for (const r of rows || []) {
      const raw = r.category ?? null;
      const cat = normalizeDbString(raw);
      const key = cat ?? "__NULL__";

      const publishedAt = r.published_at
        ? new Date(r.published_at)
        : null;

      const dominantSource = r.dominantSource
        ? String(r.dominantSource).trim()
        : "Ismeretlen";

      if (!catMap.has(key)) {
        catMap.set(key, {
          category: cat,
          articleCount: 0,
          sourceSet: new Set(),
          lastArticleAt: publishedAt ? publishedAt.toISOString() : null,
          sourceCounts: new Map(),
          sparkBuckets: new Map(), // ÚJ
        });
      }

      const entry = catMap.get(key)!;

      entry.articleCount += 1;
      entry.sourceSet.add(dominantSource);

      entry.sourceCounts.set(
        dominantSource,
        (entry.sourceCounts.get(dominantSource) || 0) + 1
      );

      if (
        publishedAt &&
        (!entry.lastArticleAt ||
          publishedAt.toISOString() > entry.lastArticleAt)
      ) {
        entry.lastArticleAt = publishedAt.toISOString();
      }

      // --- SPARKLINE BUCKET ---
      if (publishedAt) {
        const bucketKey =
          mode === "hours"
            ? publishedAt.toISOString().slice(0, 13) + ":00:00"
            : publishedAt.toISOString().slice(0, 10)
;

        entry.sparkBuckets.set(
          bucketKey,
          (entry.sparkBuckets.get(bucketKey) || 0) + 1
        );
      }
    }

    // -----------------------------------------
    // 3) Sparkline generálása
    // -----------------------------------------
    function generateSparkline(entry: any) {
      const buckets = entry.sparkBuckets;
      const spark: number[] = [];

      const cursor = new Date(start);

      if (mode === "hours") {
        for (let i = 0; i < hours; i++) {
          const key = cursor.toISOString().slice(0, 19).replace("T", " ");
          spark.push(buckets.get(key) ?? 0);
          cursor.setHours(cursor.getHours() + 1);
        }
      } else {
        for (let i = 0; i < days; i++) {
          const key = cursor.toISOString().slice(0, 10);
          spark.push(buckets.get(key) ?? 0);
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      return spark;
    }

    // -----------------------------------------
    // 4) Kategória lista + ringSources + sparkline
    // -----------------------------------------
    const categories = Array.from(catMap.values())
      .map((e) => {
        const total = Array.from(e.sourceCounts.values()).reduce(
          (sum: number, c: number) => sum + c,
          0
        );

        const ringSources = Array.from(e.sourceCounts.entries()).map(
          ([label, count]) => {
            const normalized = label.toLowerCase().replace(".hu", "").trim();

            return {
              name: normalized,
              label,
              count,
              percent: Math.round((count / total) * 100),
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
          sparkline: generateSparkline(e), // ÚJ
        };
      })
      .sort((a, b) => b.articleCount - a.articleCount);

    // -----------------------------------------
    // 5) Items
    // -----------------------------------------
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
