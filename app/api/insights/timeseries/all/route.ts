// app/api/insights/timeseries/all/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "7d";

  let hoursBack = 24;
  if (period === "7d") hoursBack = 24 * 7;
  if (period === "30d") hoursBack = 24 * 30;
  if (period === "90d") hoursBack = 24 * 90;

  const now = new Date();
  const nowUtc = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const startUtc = new Date(nowUtc.getTime() - hoursBack * 60 * 60 * 1000);

  const startStr = startUtc.toISOString().slice(0, 19).replace("T", " ");

  try {
    // ⭐ HELYES: kategóriák a SUMMARIES táblából
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM summaries
      WHERE category IS NOT NULL AND category <> ''
    `);

    const categories = (cats || [])
      .map((c: any) => normalizeDbString(c.category))
      .filter(Boolean) as string[];

    const results: any[] = [];

    for (const rawCat of categories) {
      const cat = normalizeDbString(rawCat);
      if (!cat) continue;

      // ⭐ HELYES: timeseries a SUMMARIES táblából
      const [rows]: any = await db.query(
        `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS bucket,
          COUNT(*) AS count
        FROM summaries
        WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND created_at >= ?
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [cat, startStr]
      );

      const map = new Map<string, number>();
      for (const r of rows || []) {
        map.set(String(r.bucket), Number(r.count) || 0);
      }

      const cursor = new Date(startUtc);
      cursor.setMinutes(0, 0, 0);

      const points: { date: string; count: number }[] = [];

      while (cursor <= nowUtc) {
        const key = cursor.toISOString().slice(0, 19).replace("T", " ");
        const c = map.get(key) ?? 0;

        points.push({ date: key, count: c });

        cursor.setHours(cursor.getHours() + 1);
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
