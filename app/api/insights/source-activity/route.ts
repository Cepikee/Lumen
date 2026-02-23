// app/api/insights/source-activity/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security"; // ⭐ központi védelem

// --- Forrásnév tisztító ---
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

export async function GET(req: Request) {
  try {
    // ⭐ KÖZPONTI SECURITY CHECK
    const sec = securityCheck(req);
    if (sec) return sec;

    // --- 1) Mai nap intervalluma ---
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const startStr = start.toISOString().slice(0, 19).replace("T", " ");
    const endStr = end.toISOString().slice(0, 19).replace("T", " ");

    // --- 2) Források összesített listája ---
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

    // --- 3) Órák listája ---
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // --- 4) Bucket-alapú óránkénti bontás ---
    const [rows]: any = await db.query(
      `
      SELECT 
        TRIM(source) AS source,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY TRIM(source), bucket
      ORDER BY TRIM(source), bucket
      `,
      [startStr, endStr]
    );

    // --- 5) Óránkénti mátrix ---
    const hourMap: Record<string, number[]> = {};

    for (const s of sources as { source: string; total: number }[]) {
      hourMap[s.source] = Array(24).fill(0);
    }

    for (const r of rows) {
      const src = fixSource(r.source);
      if (!src) continue;

      const hour = new Date(r.bucket).getHours();
      const count = Number(r.count) || 0;

      if (hourMap[src] && hour >= 0 && hour <= 23) {
        hourMap[src][hour] = count;
      }
    }

    // --- 6) Végső struktúra ---
    const result = sources.map((s: { source: string; total: number }) => ({
      source: s.source,
      total: s.total,
      hours: hourMap[s.source] || Array(24).fill(0),
    }));

    // --- 7) Válasz ---
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
