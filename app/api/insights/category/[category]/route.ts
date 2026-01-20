// app/api/insights/category/[category]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeParam(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

export async function GET(_req: Request, context: any) {
  const raw = context?.params?.category;
  const categoryParam = normalizeParam(raw);

  try {
    let sql = `SELECT id, title, category, published_at, source AS dominantSource FROM articles`;
    const params: any[] = [];

    if (categoryParam === null && raw !== undefined) {
      sql += ` WHERE category IS NULL`;
    } else if (categoryParam) {
      sql += ` WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))`;
      params.push(categoryParam);
    }

    sql += ` ORDER BY published_at DESC LIMIT 200`;

    const [rows]: any = await db.query(sql, params);

    const items = (rows || []).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: r.category,
      timeAgo: r.published_at ? new Date(r.published_at).toISOString() : null,
      dominantSource: r.dominantSource || "",
      href: `/insights/${r.id}`,
    }));

    return NextResponse.json({ success: true, items });
  } catch (err) {
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
