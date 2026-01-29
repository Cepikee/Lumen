import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface DailyReportRow {
  content: string;
  report_date: string;
}

export async function GET(request: Request) {
  try {
    // 🔥 Dátum kinyerése az URL-ből
    const url = new URL(request.url);
    const date = url.pathname.split("/").pop(); // pl. "2026-01-28"

    if (!date) {
      return NextResponse.json(
        { error: "Missing date parameter" },
        { status: 400 }
      );
    }

    // 🔥 DB lekérdezés
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
