// app/api/insights/forecast/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

// ⭐ Biztonságos dátum normalizáló
function normalizeDate(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const sec = securityCheck(req);
  if (sec) return sec;

  try {
    const [rows]: any = await db.query(`
      SELECT category, date, predicted
      FROM forecast
      ORDER BY category, date
    `);

    const result: Record<string, any[]> = {};

    for (const r of rows) {
      const cat = r.category || "Ismeretlen";
      if (!result[cat]) result[cat] = [];

      result[cat].push({
        date: normalizeDate(r.date),   // ⭐ mindig string lesz, nem Date
        predicted: r.predicted,
      });
    }

    return NextResponse.json({
      success: true,
      forecast: result,
    });

  } catch (err) {
    console.error("Forecast API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
