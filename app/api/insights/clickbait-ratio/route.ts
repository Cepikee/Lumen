// app/api/insights/clickbait-ratio/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

export async function GET(req: Request) {
  try {
    // ⭐ SECURITY CHECK
    const sec = securityCheck(req);
    if (sec) return sec;

    // ─────────────────────────────────────────────
    // 1) Forrásonkénti clickbait arány
    //    - NULL értékek kizárva
    //    - threshold = 45
    // ─────────────────────────────────────────────
    const [rows]: any = await db.query(`
      SELECT 
        source,
        SUM(CASE WHEN final_clickbait >= 45 THEN 1 ELSE 0 END) AS clickbait_count,
        COUNT(*) AS total_count
      FROM summaries
      WHERE final_clickbait IS NOT NULL
      GROUP BY source
      ORDER BY clickbait_count DESC
    `);

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
