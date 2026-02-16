// app/api/insights/timeseries/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
console.log("TIMESERIES ALL ROUTE FUT!!!");
function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const rawCategory = url.searchParams.get("category");
  const category = normalizeDbString(rawCategory);
  if (!category) {
    return NextResponse.json(
      { success: false, error: "missing_category" },
      { status: 400 }
    );
  }

  const period = url.searchParams.get("period") || "7d";
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);

  try {
    // ⭐ SUMMARIES TÁBLA HASZNÁLATA
    const sql = `
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM summaries
      WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
        AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const [rows]: any = await db.query(sql, [category, startStr]);

    const map = new Map<string, number>();
    for (const r of rows || []) {
      map.set(r.day, Number(r.count) || 0);
    }

    const points: { date: string; count: number }[] = [];
    const cursor = new Date(start);

    for (let i = 0; i < days; i++) {
      const d = cursor.toISOString().slice(0, 10);
      points.push({
        date: d,
        count: map.get(d) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      success: true,
      category,
      period,
      points,
    });
  } catch (err) {
    console.error("Timeseries error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
