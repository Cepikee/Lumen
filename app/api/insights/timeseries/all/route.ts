// app/api/insights/timeseries/all/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function fixCat(s: any): string | null {
  if (!s) return null;

  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;

  if (/[├â├ę├╝├║]/.test(t)) {
    try {
      t = Buffer.from(t, "latin1").toString("utf8").trim();
    } catch {}
  }

  return t || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "24h";

  // ⭐ PERIOD LOGIKA
  let minutesBack = 24 * 60; // default: 24h
  let bucketSize = 1;        // default: 1 perc

  if (period === "7d") {
    minutesBack = 7 * 24 * 60;
    bucketSize = 10;
  }

  if (period === "30d") {
    minutesBack = 30 * 24 * 60;
    bucketSize = 60;
  }

  if (period === "90d") {
    minutesBack = 90 * 24 * 60;
    bucketSize = 180;
  }

  // ⭐ SQL bucket formátum (dinamikus)
  const bucketFormat =
    bucketSize >= 60
      ? "%Y-%m-%d %H:00:00"   // órás vagy több
      : "%Y-%m-%d %H:%i:00";  // perces

  // ⭐ MINDEN UTC-ben
  const now = new Date();
  const nowUtc = new Date(now.toISOString()); // garantált UTC
  const startUtc = new Date(nowUtc.getTime() - minutesBack * 60 * 1000);
  const startStr = startUtc.toISOString().slice(0, 19).replace("T", " ");

  try {
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM summaries
      WHERE category IS NOT NULL AND category <> ''
    `);

    const categories = Array.from(
      new Map(
        (cats || [])
          .map((c: any) => fixCat(c.category))
          .filter(Boolean)
          .map((c: string) => [c.toLowerCase(), c])
      ).values()
    );

    const results: any[] = [];

    for (const rawCat of categories) {
      const cat = fixCat(rawCat);
      if (!cat) continue;

      // ⭐ SQL-ben is UTC-re konvertálunk
      const [rows]: any = await db.query(
        `
        SELECT 
          DATE_FORMAT(CONVERT_TZ(created_at, @@session.time_zone, '+00:00'), '${bucketFormat}') AS bucket,
          COUNT(*) AS count
        FROM summaries
        WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND created_at >= CONVERT_TZ(?, '+00:00', @@session.time_zone)
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
      cursor.setSeconds(0, 0);

      const points: { date: string; count: number }[] = [];

      // ⭐ DINAMIKUS BUCKET LÉPTETÉS — UTC-ben
      while (cursor <= nowUtc) {
        const key = cursor.toISOString().slice(0, 19).replace("T", " ");
        points.push({ date: key, count: map.get(key) ?? 0 });

        cursor.setMinutes(cursor.getMinutes() + bucketSize);
      }

      results.push({ category: cat, points });
    }

    return NextResponse.json({ success: true, period, categories: results });
  } catch (err) {
    console.error("Timeseries ALL error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
