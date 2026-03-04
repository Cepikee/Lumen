// app/api/insights/spike-detection/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

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

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    // HELYI IDŐ – mai nap 00:00:00 → 23:59:59
    const now = new Date();
    const startStr =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")} 00:00:00`;

    const endStr =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")} 23:59:59`;

    const spikes: any[] = [];

    const [catRows]: any = await db.query(
      `
      SELECT 
        TRIM(category) AS category,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at <= ?
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category), bucket
      HAVING count >= 3
      ORDER BY count DESC
      LIMIT 40
      `,
      [startStr, endStr]
    );

    for (const r of catRows || []) {
      const cat = fixText(r.category);
      if (!cat) continue;
      const hour = new Date(r.bucket).getHours();
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
        TRIM(source) AS source,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at <= ?
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY TRIM(source), bucket
      HAVING count >= 3
      ORDER BY count DESC
      LIMIT 40
      `,
      [startStr, endStr]
    );

    for (const r of srcRows || []) {
      const src = fixText(r.source);
      if (!src) continue;
      const hour = new Date(r.bucket).getHours();
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
      .sort((a, b) => b.score - a.score)
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
