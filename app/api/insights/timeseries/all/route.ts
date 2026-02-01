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

export async function GET(req: Request) {
  const url = new URL(req.url);

  const period = url.searchParams.get("period") || "7d";
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;

  // helyes kezdődátum: most - days + 1 (pl. 7 nap: 7 napot fed le)
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().slice(0, 10);

  try {
    // 1) Kategóriák lekérése a DB-ből (normalizálva)
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

    // 2) Minden kategóriához idősor lekérése
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
        // r.day is 'YYYY-MM-DD'
        map.set(String(r.day), Number(r.count) || 0);
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

    // Ha minden kategória 0, adjunk vissza diagnosztikát is
    if (!anyNonZero) {
      // összes cikk az időszakban
      const [totalRows]: any = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM articles
        WHERE DATE(published_at) >= DATE(?)
        `,
        [startStr]
      );

      // kategória eloszlás az időszakban (lowered, trimmed)
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

      // egy példa lekérdezés egy kategóriára (ha van legalább egy)
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
          rows: sampleRows || [],
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

    // normál visszaadás, ha van legalább egy nem‑null adat
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
