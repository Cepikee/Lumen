// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t || null;
}

function toLocalISOString(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "7d";

  let mode: "days" | "hours" = "days";
  let days = 7;
  let hours = 24;

  if (period === "24h") mode = "hours";
  else if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  const now = new Date();
  let start: Date;

  if (mode === "hours") {
    start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
  }

  const startStr = toLocalISOString(start).slice(0, 19).replace("T", " ");

  const rawCategory = url.searchParams.get("category");
  const categoryParam = rawCategory ? String(rawCategory).trim() : null;

  try {
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

    const periodClause = `${where ? " AND" : " WHERE"} created_at >= ?`;

    const sql = `
      SELECT 
        article_id AS id,
        title,
        category,
        created_at,
        source AS dominantSource
      FROM summaries
      ${where}
      ${periodClause}
      ORDER BY created_at DESC
    `;

    const [rows]: any = await db.query(sql, params);

    const catMap = new Map<
      string,
      {
        category: string | null;
        articleCount: number;
        sourceSet: Set<string>;
        lastArticleAt: string | null;
        sourceCounts: Map<string, number>;
        sparkBuckets: Map<string, number>;
      }
    >();

    for (const r of rows || []) {
      const cat = normalizeDbString(r.category);
      const key = cat ?? "__NULL__";

      const publishedAt = r.created_at ? new Date(r.created_at) : null;
      const dominantSource = r.dominantSource ? String(r.dominantSource).trim() : "Ismeretlen";

      if (!catMap.has(key)) {
        catMap.set(key, {
          category: cat,
          articleCount: 0,
          sourceSet: new Set(),
          lastArticleAt: publishedAt ? toLocalISOString(publishedAt) : null,
          sourceCounts: new Map(),
          sparkBuckets: new Map(),
        });
      }

      const entry = catMap.get(key)!;
      entry.articleCount += 1;
      entry.sourceSet.add(dominantSource);
      entry.sourceCounts.set(dominantSource, (entry.sourceCounts.get(dominantSource) || 0) + 1);

      if (publishedAt && (!entry.lastArticleAt || toLocalISOString(publishedAt) > entry.lastArticleAt)) {
        entry.lastArticleAt = toLocalISOString(publishedAt);
      }

      if (publishedAt) {
        const local = new Date(publishedAt.getTime() - publishedAt.getTimezoneOffset() * 60000);
        const bucketKey =
          mode === "hours"
            ? local.toISOString().slice(0, 13) + ":00:00"
            : local.toISOString().slice(0, 10);

        entry.sparkBuckets.set(bucketKey, (entry.sparkBuckets.get(bucketKey) || 0) + 1);
      }
    }

    function generateSparkline(entry: any) {
      const buckets = entry.sparkBuckets;
      const spark: number[] = [];
      let cursor = new Date(start);

      const steps = mode === "hours" ? hours : days;
      for (let i = 0; i < steps; i++) {
        const localCursor = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000);
        const key =
          mode === "hours"
            ? localCursor.toISOString().slice(0, 13) + ":00:00"
            : localCursor.toISOString().slice(0, 10);

        spark.push(buckets.get(key) ?? 0);

        if (mode === "hours") cursor.setHours(cursor.getHours() + 1);
        else cursor.setDate(cursor.getDate() + 1);
      }

      return spark;
    }

    const categories = Array.from(catMap.values())
      .map((e) => {
        const total = Array.from(e.sourceCounts.values()).reduce((sum: number, c: number) => sum + c, 0) || 1;

        const ringSources = Array.from(e.sourceCounts.entries()).map(([label, count]) => {
          const normalized = label.toLowerCase().replace(".hu", "").trim();
          return {
            name: normalized,
            label,
            count,
            percent: Math.round((count / total) * 100),
          };
        });

        return {
          category: e.category,
          trendScore: e.articleCount,
          articleCount: e.articleCount,
          sourceDiversity: e.sourceSet.size,
          lastArticleAt: e.lastArticleAt,
          ringSources,
          sparkline: generateSparkline(e),
        };
      })
      .sort((a, b) => b.articleCount - a.articleCount);

    const items = (rows || []).slice(0, 200).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: normalizeDbString(r.category),
      timeAgo: r.created_at ? toLocalISOString(new Date(r.created_at)) : null,
      dominantSource: r.dominantSource || "",
      sources: 1,
      score: 0,
      href: normalizeDbString(r.category)
        ? `/insights/category/${encodeURIComponent(normalizeDbString(r.category)!)}` 
        : `/insights/${r.id}`,
    }));

    return NextResponse.json({ success: true, period, categories, items });
  } catch (err) {
    console.error("Insights route error:", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
