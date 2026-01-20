// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeDbString(s: any) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawCategory = url.searchParams.get("category");
  const category = normalizeDbString(rawCategory);
  const filter = String(url.searchParams.get("filter") || "").trim().toLowerCase();

  try {
    let itemsSql = `SELECT id, title, category, published_at, source AS dominantSource, 0 AS sources, 0 AS score
                    FROM articles`;
    const params: any[] = [];

    if (category === null && rawCategory !== null) {
      // explicit "null" param -> return NULL categories
      itemsSql += ` WHERE category IS NULL`;
    } else if (category) {
      itemsSql += ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      params.push(category);
    }

    itemsSql += ` ORDER BY published_at DESC LIMIT 200`;

    const [rows]: any = await db.query(itemsSql, params);

    const items = (rows || []).map((r: any) => {
      const cat = normalizeDbString(r.category);
      return {
        id: String(r.id),
        title: r.title,
        category: cat,
        timeAgo: r.published_at ? new Date(r.published_at).toISOString() : null,
        dominantSource: r.dominantSource || "",
        sources: Number(r.sources || 0),
        score: Number(r.score || 0),
        href: cat ? `/insights/category/${encodeURIComponent(cat)}` : `/insights/${r.id}`,
      };
    });

    const [catsRows]: any = await db.query(
      `SELECT LOWER(TRIM(category)) AS cat_norm, COUNT(*) AS cnt
       FROM articles
       GROUP BY LOWER(TRIM(category))
       ORDER BY cnt DESC
       LIMIT 200`
    );

    const categories = (catsRows || []).map((c: any) => c.cat_norm).filter(Boolean);

    return NextResponse.json({ success: true, items, categories });
  } catch (err) {
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
