// app/api/insights/source-activity/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { businessDayBounds, hourInZone, mysqlUtc } from "@/lib/business-time";

function fixSource(s: any): string | null {
  if (!s) return null;
  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;
  if (/[├â├ę├╝├║]/.test(t)) {
    try { t = Buffer.from(t, "latin1").toString("utf8").trim(); } catch {}
  }
  return t || null;
}

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    const bounds = businessDayBounds(new Date());
    const startStr = mysqlUtc(bounds.start);
    const endStr = mysqlUtc(bounds.end);

    const [totals]: any = await db.query(
      `
      SELECT 
        LOWER(TRIM(source)) AS source,
        COUNT(*) AS total
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND TRIM(source) <> ''
      GROUP BY LOWER(TRIM(source))
      ORDER BY total DESC
      `,
      [startStr, endStr]
    );

    const sources = (totals || [])
      .map((r: any) => ({
        source: fixSource(r.source),
        total: Number(r.total) || 0,
      }))
      .filter(
        (r: { source: string | null; total: number }): r is { source: string; total: number } =>
          typeof r.source === "string" && r.source.length > 0
      );

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const [rows]: any = await db.query(
      `
      SELECT 
        LOWER(TRIM(source)) AS source,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND TRIM(source) <> ''
      GROUP BY LOWER(TRIM(source)), bucket
      ORDER BY LOWER(TRIM(source)), bucket
      `,
      [startStr, endStr]
    );

    const hourMap: Record<string, number[]> = {};
    for (const s of sources) hourMap[s.source] = Array(24).fill(0);

    for (const r of rows) {
      const src = fixSource(r.source);
      if (!src) continue;
      const hour = hourInZone(new Date(`${String(r.bucket).replace(" ", "T")}Z`));
      const count = Number(r.count) || 0;
      if (hourMap[src] && hour >= 0 && hour <= 23) {
        // DST visszaállításkor ugyanaz a helyi óra két UTC bucketből jön.
        hourMap[src][hour] += count;
      }
    }

    const result = sources.map((s: { source: string; total: number }) => ({
  source: s.source,
  total: s.total,
  hours: hourMap[s.source] || Array(24).fill(0),
}));


    return NextResponse.json({
      success: true,
      hours,
      sources: result,
    });

  } catch (err) {
    console.error("Source Activity API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
