// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t || null;
}

function normalizeDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: Request) {
  const sec = await securityCheck(req);
  if (sec) return sec;

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "7d";
  const rawSortParam = url.searchParams.get("sort");
  const rawSort = (rawSortParam === null ? "Legfrissebb" : rawSortParam).trim();
  // The Insights UI sends Hungarian labels. Keep the API tolerant of the
  // stable English aliases used by older links, but never silently interpret
  // an arbitrary value as a different ordering.
  const sort = new Map([
    ["Legfrissebb", "latest"],
    ["latest", "latest"],
    ["Növekvő", "growing"],
    ["growing", "growing"],
    ["Legtöbb forrás", "sources"],
    ["sources", "sources"],
  ]).get(rawSort);
  if (!sort) {
    return NextResponse.json(
      { success: false, error: "invalid_sort" },
      { status: 400 }
    );
  }

  let mode: "days" | "hours" = "days";
  let days = 7;
  let hours = 24;

  if (period === "24h") mode = "hours";
  else if (period === "7d") days = 7;
  else if (period === "30d") days = 30;
  else if (period === "90d") days = 90;
  else {
    return NextResponse.json(
      { success: false, error: "invalid_period" },
      { status: 400 }
    );
  }

  const now = new Date();
  let start: Date;

  if (mode === "hours") {
    start = new Date(now.getTime() - hours * 3600 * 1000);
  } else {
    start = new Date(now);
    // Keep the rolling period independent from the host timezone. The DB
    // timestamps and the end bound are handled as UTC values.
    start.setUTCDate(start.getUTCDate() - (days - 1));
  }

  const startStr =
    `${start.getUTCFullYear()}-` +
    `${String(start.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(start.getUTCDate()).padStart(2, "0")} ` +
    `${String(start.getUTCHours()).padStart(2, "0")}:` +
    `${String(start.getMinutes()).padStart(2, "0")}:` +
    `${String(start.getSeconds()).padStart(2, "0")}`;
  const endStr =
    `${now.getUTCFullYear()}-` +
    `${String(now.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getUTCDate()).padStart(2, "0")} ` +
    `${String(now.getUTCHours()).padStart(2, "0")}:` +
    `${String(now.getUTCMinutes()).padStart(2, "0")}:` +
    `${String(now.getUTCSeconds()).padStart(2, "0")}`;

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

    params.push(startStr, endStr);

    const periodClause = `${where ? " AND" : " WHERE"} created_at >= ? AND created_at < ?`;

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

      const publishedAt = normalizeDate(r.created_at);
      // Source diversity/counts are semantic aggregates. Treat historical
      // case and whitespace variants as one source, otherwise "Telex" and
      // " telex " inflate diversity and split the ring chart.
      const dominantSource = r.dominantSource
        ? String(r.dominantSource).trim().toLocaleLowerCase("hu-HU") || "ismeretlen"
        : "ismeretlen";

      if (!catMap.has(key)) {
        catMap.set(key, {
          category: cat,
          articleCount: 0,
          sourceSet: new Set(),
          lastArticleAt: publishedAt ? publishedAt.toISOString() : null,
          sourceCounts: new Map(),
          sparkBuckets: new Map(),
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
        (!entry.lastArticleAt || publishedAt.toISOString() > entry.lastArticleAt)
      ) {
        entry.lastArticleAt = publishedAt.toISOString();
      }

      if (publishedAt) {
        const bucketKey =
          mode === "hours"
            ? publishedAt.toISOString().slice(0, 13) + ":00:00"
            : publishedAt.toISOString().slice(0, 10);

        entry.sparkBuckets.set(
          bucketKey,
          (entry.sparkBuckets.get(bucketKey) || 0) + 1
        );
      }
    }

    function generateSparkline(entry: any) {
      const buckets = entry.sparkBuckets;
      const spark: number[] = [];
      let cursor = new Date(start);

      const steps = mode === "hours" ? hours : days;
      for (let i = 0; i < steps; i++) {
        const key =
          mode === "hours"
            ? cursor.toISOString().slice(0, 13) + ":00:00"
            : cursor.toISOString().slice(0, 10);

        spark.push(buckets.get(key) ?? 0);

        if (mode === "hours") cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
        else cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
      }

      return spark;
    }

    const categories = Array.from(catMap.values())
      .map((e) => {
        const total =
          Array.from(e.sourceCounts.values()).reduce(
            (sum: number, c: number) => sum + c,
            0
          ) || 1;

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
          sparkline: generateSparkline(e),
        };
      })
      .sort((a, b) => {
        if (sort === "latest") {
          return String(b.lastArticleAt || "").localeCompare(String(a.lastArticleAt || ""))
            || b.articleCount - a.articleCount
            || String(a.category || "").localeCompare(String(b.category || ""));
        }
        if (sort === "sources") {
          return b.sourceDiversity - a.sourceDiversity
            || b.articleCount - a.articleCount
            || String(a.category || "").localeCompare(String(b.category || ""));
        }
        return a.articleCount - b.articleCount
          || String(a.category || "").localeCompare(String(b.category || ""));
      });

    // Legacy summaries may exist without a canonical article relation. They
    // still belong in the category aggregates above, but must not become
    // navigable `/insights/null` items in the UI.
    const items = (rows || [])
      .filter((r: any) => {
        const id = Number(r?.id);
        return Number.isSafeInteger(id) && id > 0;
      })
      .slice(0, 200)
      .map((r: any) => {
      const created = normalizeDate(r.created_at);

      return {
        id: String(r.id),
        title: r.title,
        category: normalizeDbString(r.category),
        timeAgo: created ? created.toISOString() : null,
        dominantSource: r.dominantSource || "",
        sources: 1,
        score: 0,
        href: normalizeDbString(r.category)
          ? `/insights/category/${encodeURIComponent(
              normalizeDbString(r.category)!
            )}`
          : `/insights/${r.id}`,
      };
      });

    return NextResponse.json({ success: true, period, categories, items });
  } catch (err) {
    console.error("Insights route error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
