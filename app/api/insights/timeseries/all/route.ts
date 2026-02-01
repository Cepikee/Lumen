// app/api/insights/timeseries/all/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const period = url.searchParams.get("period") || "7d";
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  // 🔥 A HELYES kezdődátum
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().slice(0, 10);

  try {
    // 🔥 1) Kategóriák LEKÉRÉSE a működő insights endpointból
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const insightsRes = await fetch(`${base}/api/insights?period=${period}`, {
      cache: "no-store",
    });
    const insights = await insightsRes.json();

    const categories = insights.categories.map((c: any) => c.category);

    const results: any[] = [];

    // 🔥 2) Minden kategóriához idősor
    for (const cat of categories) {
      const [rows]: any = await db.query(
        `
        SELECT 
          DATE(published_at) AS day,
          COUNT(*) AS count
        FROM articles
        WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND DATE(published_at) >= DATE(?)
        GROUP BY day
        ORDER BY day ASC
        `,
        [cat, startStr]
      );

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

      results.push({
        category: cat,
        points,
      });
    }

    return NextResponse.json({
      success: true,
      period,
      categories: results,
    });
  } catch (err) {
    console.error("Timeseries ALL error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
