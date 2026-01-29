import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface DailyReportRow {
  content: string;
  report_date: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // 🔥 1) Dátum a path végén
    let date = url.pathname.split("/").pop() || "";

    // 🔥 2) Ha ID jött (pl. 123), akkor nézzük meg a videók táblában a dátumot
    if (date && !date.includes("-")) {
      const [videoRows] = await db.query(
        `SELECT date FROM videos WHERE id = ? LIMIT 1`,
        [date]
      );

      const video = (videoRows as any[])[0];
      if (video?.date) {
        date = video.date.toISOString().split("T")[0];
      }
    }

    // 🔥 3) Ha query paraméterben jött (pl. ?video=123)
    const videoId = url.searchParams.get("video");
    if (!date && videoId) {
      const [videoRows] = await db.query(
        `SELECT date FROM videos WHERE id = ? LIMIT 1`,
        [videoId]
      );

      const video = (videoRows as any[])[0];
      if (video?.date) {
        date = video.date.toISOString().split("T")[0];
      }
    }

    if (!date) {
      return NextResponse.json(
        { error: "Missing date or videoId" },
        { status: 400 }
      );
    }

    // 🔥 4) Napi riport lekérése
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
