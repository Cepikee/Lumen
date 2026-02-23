// app/api/insights/forecast/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security"; // ⭐ központi védelem

export async function GET(req: Request) {
  // ⭐ KÖZPONTI SECURITY CHECK
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
      if (!result[r.category]) result[r.category] = [];
      result[r.category].push({
        date: r.date,
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
