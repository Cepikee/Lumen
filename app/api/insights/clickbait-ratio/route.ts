// app/api/insights/clickbait-ratio/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { mysqlUtc } from "@/lib/business-time";
import { resolveInsightsWindow } from "@/lib/insights-period";

export async function GET(req: Request) {
  try {
    // ⭐ SECURITY CHECK
    const sec = await securityCheck(req);
    if (sec) return sec;

    const { searchParams } = new URL(req.url);
    const { start, end } = resolveInsightsWindow(searchParams.get("period"));

    // ─────────────────────────────────────────────
    // 1) Forrásonkénti clickbait arány
    //    - NULL értékek kizárva
    //    - threshold = 45
    // ─────────────────────────────────────────────
    const [rows]: any = await db.query(`
      SELECT 
        COALESCE(NULLIF(LOWER(TRIM(source)), ''), 'ismeretlen') AS source,
        SUM(CASE WHEN final_clickbait >= 45 THEN 1 ELSE 0 END) AS clickbait_count,
        COUNT(*) AS total_count
      FROM summaries
      WHERE final_clickbait IS NOT NULL
        AND created_at >= ? AND created_at < ?
      GROUP BY COALESCE(NULLIF(LOWER(TRIM(source)), ''), 'ismeretlen')
      ORDER BY clickbait_count DESC
    `, [mysqlUtc(start), mysqlUtc(end)]);

    const sources = rows.map((r: any) => {
      const total = Number(r.total_count) || 0;
      const cb = Number(r.clickbait_count) || 0;

      return {
        source: r.source,
        clickbait: cb,
        total,
        ratio: total > 0 ? cb / total : 0
      };
    });

    // ─────────────────────────────────────────────
    // VÁLASZ
    // ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      sources
    });

  } catch (err) {
    console.error("Clickbait Ratio API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
