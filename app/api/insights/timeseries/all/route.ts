// app/api/insights/timeseries/all/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Ugyanaz a normalizáló, mint az insights endpointban
 */
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
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  // 🔥 A HELYES kezdődátum (nem csúszik el 1 nappal)
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().slice(0, 10);

  try {
    // ---------------------------------------------------------
    // 1) ÖSSZES KATEGÓRIA LEKÉRÉSE (ugyanúgy, mint insights)
    // ---------------------------------------------------------
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM articles
      WHERE category IS NOT NULL AND category <> ''
    `);

    const categories = cats
      .map((c: any) => normalizeDbString(c.category))
      .filter(Boolean) as string[];

    // ---------------------------------------------------------
    // 2) Minden kategóriához idősor lekérése
    // ---------------------------------------------------------
    const results: any[] = [];

    for (const rawCat of categories) {
      const cat = normalizeDbString(rawCat);
      if (!cat) continue;

      const [rows]: any = await db.query(
        `
        SELECT 
          DATE(CAST(published_at AS DATETIME)) AS day,
          COUNT(*) AS count
        FROM articles
        WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND DATE(CAST(published_at AS DATETIME)) >= ?
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
