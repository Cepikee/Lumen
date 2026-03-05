// app/api/insights/speedindex/leaderboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

function normalizeDate(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function clampNumber(v: any, max = 1000): number | null {
  const n = Number(v);
  if (!isFinite(n) || isNaN(n)) return null;
  if (n < 0) return null;
  return n > max ? null : n;
}

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

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

    // sanitize + clamp suspicious values
    const safeRows = rows.map((r: any) => ({
      ...r,
      avgDelay: clampNumber(r.avgDelay, 1000),
      medianDelay: clampNumber(r.medianDelay, 1000),
    }));

    const leaderboard = await Promise.all(
      safeRows.map(async (r: any) => {
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
          avgDelay: r.avgDelay === null ? null : Number(r.avgDelay),
          medianDelay: r.medianDelay === null ? null : Number(r.medianDelay),
          updatedAt: normalizeDate(r.updatedAt),
          history: (historyRows || [])
            .map((h: any) => clampNumber(h.delay_minutes, 1000))
            .filter((x: any) => x !== null)
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
