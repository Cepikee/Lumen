// app/api/insights/timeseries/all/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { mysqlUtc } from "@/lib/business-time";

function fixCat(s: any): string | null {
  if (!s) return null;
  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;
  if (/[├â├ę├╝├║]/.test(t)) {
    try { t = Buffer.from(t, "latin1").toString("utf8").trim(); } catch {}
  }
  return t || null;
}

export async function GET(req: Request) {
  const sec = await securityCheck(req);
  if (sec) return sec;

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "24h";
  if (!["24h", "7d", "30d", "90d"].includes(period)) {
    return NextResponse.json({ success: false, error: "invalid_period" }, { status: 400 });
  }

  let minutesBack = 24 * 60;
  let sqlBucket = "%Y-%m-%d %H:%i:00";

  if (period === "7d") {
    minutesBack = 7 * 24 * 60;
    sqlBucket = "%Y-%m-%d %H:00:00";
  }

  if (period === "30d") {
    minutesBack = 30 * 24 * 60;
    sqlBucket = "%Y-%m-%d %H:00:00";
  }

  if (period === "90d") {
    minutesBack = 90 * 24 * 60;
    sqlBucket = "%Y-%m-%d %H:00:00";
  }

  const now = new Date();
  const endStr = mysqlUtc(now);
  const startStr = mysqlUtc(new Date(now.getTime() - minutesBack * 60 * 1000));

  try {
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM summaries
      WHERE category IS NOT NULL AND category <> ''
        AND created_at >= ?
        AND created_at < ?
    `, [startStr, endStr]);

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

      const [rows]: any = await db.query(
        `
        SELECT 
          DATE_FORMAT(created_at, '${sqlBucket}') AS bucket,
          COUNT(*) AS count
        FROM summaries
        WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND created_at >= ?
          AND created_at < ?
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [cat, startStr, endStr]
      );

      const points = rows.map((r: any) => ({
        date: String(r.bucket),
        count: Number(r.count) || 0,
      }));

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
// This API route returns time series data for all categories over a specified period (24h, 7d, 30d, 90d).
