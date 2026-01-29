import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const param = url.pathname.split("/").pop() || "";

    // ha YYYY-MM-DD → közvetlen dátumos keresés
    if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
      const date = param;
      const r = await db.query(
        "SELECT id, report_date, content FROM daily_reports WHERE DATE(report_date) = ? LIMIT 1",
        [date]
      );
      const rows: any[] = JSON.parse(JSON.stringify(r[0] || []));
      if (!rows.length) return NextResponse.json({ hasReport: false });
      return NextResponse.json({ hasReport: true, content: rows[0].content });
    }

    // ha szám → videó ID: JOIN a daily_reports-szal a videos.date alapján
    if (/^\d+$/.test(param)) {
      const vid = param;
      const r = await db.query(
        `SELECT dr.content
         FROM daily_reports dr
         JOIN videos v ON DATE(dr.report_date) = DATE(v.date)
         WHERE v.id = ? LIMIT 1`,
        [vid]
      );
      const rows: any[] = JSON.parse(JSON.stringify(r[0] || []));
      if (!rows.length) return NextResponse.json({ hasReport: false });
      return NextResponse.json({ hasReport: true, content: rows[0].content });
    }

    // egyébként nincs értelmezhető param
    return NextResponse.json({ hasReport: false });
  } catch (err: any) {
    console.error("READ API unexpected error:", err && err.stack ? err.stack : err);
    return new NextResponse(JSON.stringify({ hasReport: false, error: "internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
