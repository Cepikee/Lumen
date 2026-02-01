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
  if (!value && value !== 0) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
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

  let mode: "days" | "hours" = "days";
  let days = 7;
  let hours = 24;

  if (period === "24h") {
    mode = "hours";
  } else if (period === "30d") {
    days = 30;
  } else if (period === "90d") {
    days = 90;
  }

  const now = new Date();
  let start: Date;

  if (mode === "hours") {
    // most óra eleje
    const aligned = new Date(now);
    aligned.setMinutes(0, 0, 0);
    // 24 órás ablak: 23 órát vissza
    start = new Date(aligned.getTime() - (hours - 1) * 60 * 60 * 1000);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
  }

  const startStr =
    mode === "hours"
      ? start.toISOString().slice(0, 19).replace("T", " ")
      : start.toISOString().slice(0, 10) + " 00:00:00";

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

    for (const rawCat of categories) {
      const cat = normalizeDbString(rawCat);
      if (!cat) continue;

      let rows: any[] = [];

      if (mode === "hours") {
        const [r]: any = await db.query(
          `
          SELECT 
            DATE_FORMAT(published_at, '%Y-%m-%d %H:00:00') AS bucket,
            COUNT(*) AS count
          FROM articles
          WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
            AND published_at >= ?
          GROUP BY bucket
          ORDER BY bucket ASC
          `,
          [cat, startStr]
        );
        rows = r || [];
      } else {
        const [r]: any = await db.query(
          `
          SELECT 
            DATE(published_at) AS bucket,
            COUNT(*) AS count
          FROM articles
          WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
            AND DATE(published_at) >= DATE(?)
          GROUP BY bucket
          ORDER BY bucket ASC
          `,
          [cat, startStr]
        );
        rows = r || [];
      }

      const map = new Map<string, number>();
      for (const r of rows) {
        const key =
          mode === "hours"
            ? String(r.bucket) // "YYYY-MM-DD HH:00:00"
            : toYMD(r.bucket); // "YYYY-MM-DD"

        map.set(key, Number(r.count) || 0);
      }

      const points: { date: string; count: number }[] = [];
      const cursor = new Date(start);

      if (mode === "hours") {
        for (let i = 0; i < hours; i++) {
          const key = cursor.toISOString().slice(0, 19).replace("T", " ");
          const c = map.get(key) ?? 0;

          points.push({
            date: key,
            count: c,
          });

          cursor.setHours(cursor.getHours() + 1);
        }
      } else {
        for (let i = 0; i < days; i++) {
          const key = cursor.toISOString().slice(0, 10);
          const c = map.get(key) ?? 0;

          points.push({
            date: key,
            count: c,
          });

          cursor.setDate(cursor.getDate() + 1);
        }
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
