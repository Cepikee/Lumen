import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// A DB sor típusosítása
interface DailyReportRow {
  content: string;
  report_date: string;
}

export async function GET(
  req: NextRequest,
  context: { params: { date: string } }
) {
  const { date } = context.params; // pl. "2026-01-28"

  try {
    // A MySQL driver mindig TÖMBÖT ad vissza
    const [rows] = await db.query(
      `SELECT content, report_date
       FROM daily_reports
       WHERE DATE(report_date) = ?
       LIMIT 1`,
      [date]
    );

    const row = (rows as DailyReportRow[])[0];

    if (!row) {
      return NextResponse.json({
        content: null,
        date,
        hasReport: false,
      });
    }

    return NextResponse.json({
      content: row.content,
      date: row.report_date,
      hasReport: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "DB error", details: String(err) },
      { status: 500 }
    );
  }
}
