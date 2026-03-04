// app/api/insights/speedindex/leaderboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

// ⭐ Biztonságos dátum normalizáló
function normalizeDate(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    // 1️⃣ Aktuális aggregált adatok
    const [rows]: any = await db.query(`
      SELECT 
        source,
        avg_delay_minutes AS avgDelay,
        median_delay_minutes AS medianDelay,
        updated_at AS updatedAt
      FROM speed_index
      ORDER BY avg_delay_minutes ASC
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: [],
      });
    }

    // 2️⃣ History lekérés source-onként (utolsó 20 mérés)
    const leaderboard = await Promise.all(
      rows.map(async (r: any) => {
        const [historyRows]: any = await db.query(
          `
          SELECT delay_minutes
          FROM speed_index_history
          WHERE source = ?
          ORDER BY created_at DESC
          LIMIT 20
          `,
          [r.source]
        );

        return {
          source: r.source,
          avgDelay: Number(r.avgDelay),
          medianDelay: Number(r.medianDelay),
          updatedAt: normalizeDate(r.updatedAt),   // ⭐ mindig string vagy null
          history: historyRows
            .map((h: any) => Number(h.delay_minutes))
            .reverse(),
        };
      })
    );

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
