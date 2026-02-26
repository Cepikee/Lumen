// app/api/insights/speedindex/leaderboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security"; // ⭐ központi védelem

export async function GET(req: Request) {
  try {
    // ⭐ KÖZPONTI SECURITY CHECK
    const sec = securityCheck(req);
    if (sec) return sec;

    // --- 1) Speed Index adatok lekérése ---
    const [rows]: any = await db.query(
      `
      SELECT 
        source,
        avg_delay_minutes AS avgDelay,
        median_delay_minutes AS medianDelay,
        updated_at AS updatedAt
      FROM speed_index
      ORDER BY avg_delay_minutes ASC
      `
    );

    // --- 2) Ha nincs adat ---
    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: [],
      });
    }

    // --- 3) Válasz összeállítása ---
    const leaderboard = rows.map((r: any) => ({
      source: r.source,
      avgDelay: Number(r.avgDelay),
      medianDelay: Number(r.medianDelay),
      updatedAt: r.updatedAt,
    }));

    // --- 4) JSON válasz ---
    return NextResponse.json({
      success: true,
      leaderboard,
    });

  } catch (err) {
    console.error("SpeedIndex API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
