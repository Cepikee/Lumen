import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const param = url.pathname.split("/").pop() || "";

    let date: string | null = null;

    // ha szám → videó ID
    if (/^\d+$/.test(param)) {
      const result = await db.query(
        "SELECT DATE(`date`) AS dateOnly, `date` FROM videos WHERE id = ? LIMIT 1",
        [param]
      );
      const rows: any[] = JSON.parse(JSON.stringify(result[0] || []));
      const v = rows[0];
      if (v?.dateOnly) {
        date = String(v.dateOnly);
      } else if (v?.date) {
        date = new Date(v.date).toISOString().split("T")[0];
      }
    }

    // ha YYYY-MM-DD → dátum
    if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
      date = param;
    }

    if (!date) {
      return NextResponse.json({ hasReport: false });
    }

    const result2 = await db.query(
      "SELECT id, report_date, content FROM daily_reports WHERE DATE(report_date) = ? LIMIT 1",
      [date]
    );
    const rep: any[] = JSON.parse(JSON.stringify(result2[0] || []));

    if (!rep.length) {
      return NextResponse.json({ hasReport: false });
    }

    return NextResponse.json({
      hasReport: true,
      content: rep[0].content,
    });
  } catch (err: any) {
    console.error("READ API unexpected error:", err && err.stack ? err.stack : err);
    return new NextResponse(JSON.stringify({ hasReport: false, error: "internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
