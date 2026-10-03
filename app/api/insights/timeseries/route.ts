// app/api/insights/timeseries/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { mysqlUtc } from "@/lib/business-time";

function normalizeDbString(s: any): string | null {
  if (s === null || s === undefined) return null;
  let t = String(s).trim();
  if (!t) return null;
  if (t.toLowerCase() === "null") return null;
  return t;
}

export async function GET(req: Request) {
  const sec = await securityCheck(req);
  if (sec) return sec;

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
  if (!(new Set(["7d", "30d", "90d"])).has(period)) {
    return NextResponse.json(
      { success: false, error: "invalid_period" },
      { status: 400 }
    );
  }
  let days: number;
  if (period === "7d") days = 7;
  else if (period === "30d") days = 30;
  else if (period === "90d") days = 90;
  else {
    return NextResponse.json(
      { success: false, error: "invalid_period" },
      { status: 400 }
    );
  }

  const now = new Date();
  const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startStr = mysqlUtc(start).slice(0, 10);

  try {
    const sql = `
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS count
      FROM summaries
      WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
        AND created_at >= ?
        AND created_at < ?
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const [rows]: any = await db.query(sql, [category, startStr, mysqlUtc(now)]);

    const map = new Map<string, number>();
    for (const r of rows || []) {
      map.set(r.day, Number(r.count) || 0);
    }

    const points: { date: string; count: number }[] = [];
    const cursor = new Date(`${startStr}T00:00:00Z`);

    for (let i = 0; i < days; i++) {
      const d =
        `${cursor.getUTCFullYear()}-` +
        `${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-` +
        `${String(cursor.getUTCDate()).padStart(2, "0")}`;

      points.push({
        date: d,
        count: map.get(d) ?? 0,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
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
