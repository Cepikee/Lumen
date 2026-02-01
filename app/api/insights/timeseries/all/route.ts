// app/api/insights/timeseries/all/route.ts
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

function toYMD(value: any): string {
  // value lehet Date objektum, ISO string vagy 'YYYY-MM-DD'
  if (!value && value !== 0) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      // ha nem parse-olható, fallback: string első 10 karakter
      return String(value).slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const period = url.searchParams.get("period") || "7d";
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().slice(0, 10);

  try {
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM articles
      WHERE category IS NOT NULL AND category <> ''
    `);

    const categories = (cats || [])
      .map((c: any) => normalizeDbString(c.category))
      .filter(Boolean) as string[];

    const results: any[] = [];
    let anyNonZero = false;

    for (const rawCat of categories) {
      const cat = normalizeDbString(rawCat);
      if (!cat) continue;

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
        // Normalizáljuk a r.day értéket YYYY-MM-DD formátumra
        const key = toYMD(r.day);
        map.set(key, Number(r.count) || 0);
      }

      const points: { date: string; count: number }[] = [];
      const cursor = new Date(start);

      for (let i = 0; i < days; i++) {
        const d = cursor.toISOString().slice(0, 10);
        const c = map.get(d) ?? 0;
        if (c > 0) anyNonZero = true;
        points.push({
          date: d,
          count: c,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      results.push({
        category: cat,
        points,
      });
    }

    if (!anyNonZero) {
      const [totalRows]: any = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM articles
        WHERE DATE(published_at) >= DATE(?)
        `,
        [startStr]
      );

      const [distRows]: any = await db.query(
        `
        SELECT LOWER(TRIM(category)) AS category_norm, COUNT(*) AS cnt
        FROM articles
        WHERE category IS NOT NULL AND category <> ''
          AND DATE(published_at) >= DATE(?)
        GROUP BY category_norm
        ORDER BY cnt DESC
        `,
        [startStr]
      );

      let sampleCategoryCheck: any = null;
      if (categories.length > 0) {
        const sampleCat = categories[0];
        const [sampleRows]: any = await db.query(
          `
          SELECT DATE(published_at) AS day, COUNT(*) AS count
          FROM articles
          WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
            AND DATE(published_at) >= DATE(?)
          GROUP BY day
          ORDER BY day ASC
          `,
          [sampleCat, startStr]
        );
        sampleCategoryCheck = {
          sampleCategory: sampleCat,
          rows: (sampleRows || []).map((r: any) => ({
            day: toYMD(r.day),
            count: Number(r.count) || 0,
          })),
        };
      }

      return NextResponse.json({
        success: true,
        period,
        categories: results,
        debug: {
          note:
            "Minden kategória 0. Itt vannak a diagnosztikai adatok: összes cikk az időszakban, kategória-eloszlás és egy minta lekérdezés.",
          startStr,
          totalInPeriod: (totalRows && totalRows[0] && totalRows[0].total) || 0,
          categoryDistribution: (distRows || []).map((r: any) => ({
            category_norm: r.category_norm,
            count: Number(r.cnt) || 0,
          })),
          sampleCategoryCheck,
          dbNow: new Date().toISOString(),
        },
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
