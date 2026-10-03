// app/api/insights/spike-detection/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";

function fixText(s: any): string | null {
  if (!s) return null;
  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;
  if (/[├â├ę├╝├║]/.test(t)) {
    try { t = Buffer.from(t, "latin1").toString("utf8").trim(); } catch {}
  }
  return t || null;
}

function getSpikeLevel(count: number) {
  if (count >= 7) return "brutal";
  if (count >= 5) return "strong";
  if (count >= 3) return "mild";
  return null;
}

function localBusinessHour(bucket: unknown): number {
  const date = new Date(`${String(bucket).replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return 0;
  const value = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", hour12: false, timeZone: "Europe/Budapest"
  }).format(date));
  return value === 24 ? 0 : value;
}

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    const bounds = businessDayBounds(new Date());
    const startStr = mysqlUtc(bounds.start);
    const endStr = mysqlUtc(bounds.end);

    const spikes: any[] = [];

    const [catRows]: any = await db.query(
      `
      SELECT 
        MIN(TRIM(category)) AS category,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY LOWER(TRIM(category)), bucket
      HAVING count >= 3
      ORDER BY count DESC
      LIMIT 40
      `,
      [startStr, endStr]
    );

    for (const r of catRows || []) {
      const cat = fixText(r.category);
      if (!cat) continue;
      const hour = localBusinessHour(r.bucket);
      const level = getSpikeLevel(r.count);
      if (!level) continue;

      spikes.push({
        type: "category",
        label: cat,
        hour,
        value: Number(r.count),
        level,
      });
    }

    const [srcRows]: any = await db.query(
      `
      SELECT 
        MIN(TRIM(source)) AS source,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY LOWER(TRIM(source)), bucket
      HAVING count >= 3
      ORDER BY count DESC
      LIMIT 40
      `,
      [startStr, endStr]
    );

    for (const r of srcRows || []) {
      const src = fixText(r.source);
      if (!src) continue;
      const hour = localBusinessHour(r.bucket);
      const level = getSpikeLevel(r.count);
      if (!level) continue;

      spikes.push({
        type: "source",
        label: src,
        hour,
        value: Number(r.count),
        level,
      });
    }

    const topSpikes = spikes
      .map((s) => ({ ...s, score: s.value }))
      .sort((a, b) => b.score - a.score || a.type.localeCompare(b.type) || a.label.localeCompare(b.label, "hu") || a.hour - b.hour)
      .slice(0, 12);

    return NextResponse.json({ success: true, spikes: topSpikes });

  } catch (err) {
    console.error("Spike Detection V2 API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
