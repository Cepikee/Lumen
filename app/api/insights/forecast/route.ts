import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [rows]: any = await db.query(`
    SELECT category, date, predicted
    FROM forecast
    ORDER BY category, date
  `);

  const result: any = {};

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
}
