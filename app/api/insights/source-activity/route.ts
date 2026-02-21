import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// --- Forrásnév tisztító (ugyanolyan logika, mint a fixCat) ---
function fixSource(s: any): string | null {
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

export async function GET() {
  try {
    // --- 1) Mai nap időintervalluma ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 19).replace("T", " ");

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace("T", " ");

    // --- 2) Források összesített listája (rangsor) ---
    const [totals]: any = await db.query(
      `
      SELECT 
        TRIM(source) AS source,
        COUNT(*) AS total
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY TRIM(source)
      ORDER BY total DESC
      `,
      [todayStr, tomorrowStr]
    );

    // Normalizált forráslista
    const sources = totals
      .map((r: any) => ({
        source: fixSource(r.source),
        total: Number(r.total) || 0,
      }))
      .filter((r: any) => r.source);

    // --- 3) Órák listája (0–23) ---
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // --- 4) Óránkénti bontás lekérése ---
    const [rows]: any = await db.query(
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
      ORDER BY TRIM(source), hour
      `,
      [todayStr, tomorrowStr]
    );

    // --- 5) Óránkénti mátrix felépítése ---
    const hourMap: Record<string, number[]> = {};

    for (const s of sources) {
      hourMap[s.source as string] = Array(24).fill(0);
    }

    for (const r of rows) {
      const src = fixSource(r.source);
      if (!src) continue;

      const hour = Number(r.hour);
      const count = Number(r.count) || 0;

      if (hourMap[src] && hour >= 0 && hour <= 23) {
        hourMap[src][hour] = count;
      }
    }

    // --- 6) Végső struktúra összeállítása ---
    const result = sources.map((s: any) => ({
      source: s.source,
      total: s.total,
      hours: hourMap[s.source as string] || Array(24).fill(0),
    }));

    // --- 7) Válasz ---
    return NextResponse.json({
      success: true,
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
