import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface DailyReportRow {
  content: string;
  report_date: string;
}

export async function GET(
  request: Request,
  context: { params: { date: string } }
) {
  const { date } = context.params;

  try {
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
