import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// --- Kulcsszó tisztító ---
function cleanKeyword(s: string): string {
  return s
    .replace(/[\[\]"']/g, "")
    .trim()
    .toLowerCase();
}

// --- Forrás/kategória tisztító ---
function fixText(s: any): string | null {
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

// --- Spike szint meghatározása ---
function getSpikeLevel(count: number) {
  if (count >= 7) return "brutal";
  if (count >= 5) return "strong";
  if (count >= 3) return "mild";
  return null;
}

export async function GET() {
  try {
    // --- 1) Mai nap intervalluma ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 19).replace("T", " ");

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace("T", " ");

    const spikes: any[] = [];

    // ============================================================
    // 2) KATEGÓRIA SPIKE (3-5-7 hír egy órában)
    // ============================================================
    const [catRows]: any = await db.query(
      `
      SELECT 
        TRIM(category) AS category,
        HOUR(created_at) AS hour,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category), HOUR(created_at)
      HAVING count >= 3
      ORDER BY count DESC
      `,
      [todayStr, tomorrowStr]
    );

    for (const r of catRows) {
      const cat = fixText(r.category);
      if (!cat) continue;

      const level = getSpikeLevel(r.count);
      if (!level) continue;

      spikes.push({
        type: "category",
        label: cat,
        hour: Number(r.hour),
        value: Number(r.count),
        level,
      });
    }

    // ============================================================
    // 3) KULCSSZÓ SPIKE (3-5-7 előfordulás ma)
    // ============================================================
    const [kwRows]: any = await db.query(
      `
      SELECT trend_keywords
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND trend_keywords IS NOT NULL
        AND trend_keywords <> ''
      `,
      [todayStr, tomorrowStr]
    );

    const keywordCount: Record<string, number> = {};

    for (const row of kwRows) {
      const raw = row.trend_keywords || "";
      const parts = raw.split(",").map(cleanKeyword).filter(Boolean);

      for (const kw of parts) {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      }
    }

    for (const [kw, count] of Object.entries(keywordCount)) {
      const level = getSpikeLevel(count);
      if (!level) continue;

      spikes.push({
        type: "keyword",
        label: kw,
        value: count,
        level,
      });
    }

    // ============================================================
    // 4) FORRÁS SPIKE (3-5-7 cikk egy órában)
    // ============================================================
    const [srcRows]: any = await db.query(
      `
      SELECT 
        TRIM(source) AS source,
        HOUR(created_at) AS hour,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY TRIM(source), HOUR(created_at)
      HAVING count >= 3
      ORDER BY count DESC
      `,
      [todayStr, tomorrowStr]
    );

    for (const r of srcRows) {
      const src = fixText(r.source);
      if (!src) continue;

      const level = getSpikeLevel(r.count);
      if (!level) continue;

      spikes.push({
        type: "source",
        label: src,
        hour: Number(r.hour),
        value: Number(r.count),
        level,
      });
    }

    // ============================================================
    // 5) Válasz
    // ============================================================
    return NextResponse.json({
      success: true,
      spikes,
    });

  } catch (err) {
    console.error("Spike Detection API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
