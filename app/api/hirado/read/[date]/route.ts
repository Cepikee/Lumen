import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const param = url.pathname.split("/").pop() || "";
    console.log("READ API called, raw param:", param);

    let date: string | null = null;

    // ha szám → videó ID
    if (/^\d+$/.test(param)) {
      console.log("Param is numeric id:", param);
      const result = await db.query(
        // csak a létező mezőket kérdezzük le
        "SELECT DATE(`date`) AS dateOnly, `date` FROM videos WHERE id = ? LIMIT 1",
        [param]
      );
      console.log("DB result for videos query:", result);

      const rows: any[] = JSON.parse(JSON.stringify(result[0] || []));
      console.log("Parsed rows:", rows);

      const v = rows[0];
      if (v?.dateOnly) {
        date = String(v.dateOnly); // pl. '2026-01-28'
        console.log("Using dateOnly from DB:", date);
      } else if (v?.date) {
        date = new Date(v.date).toISOString().split("T")[0];
        console.log("Fallback computed date from v.date:", date);
      } else {
        console.log("No date found on video row for id:", param);
      }
    }

    // ha YYYY-MM-DD → dátum
    if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
      date = param;
      console.log("Param is direct date:", date);
    }

    if (!date) {
      console.log("No date resolved, returning hasReport:false");
      return NextResponse.json({ hasReport: false });
    }

    console.log("Looking up report for date:", date);

    const result2 = await db.query(
      "SELECT id, report_date, content FROM daily_reports WHERE DATE(report_date) = ? LIMIT 1",
      [date]
    );
    console.log("DB result for daily_reports query:", result2);

    const rep: any[] = JSON.parse(JSON.stringify(result2[0] || []));
    console.log("Parsed report rows:", rep);

    if (!rep.length) {
      console.log("No report found for date:", date);
      return NextResponse.json({ hasReport: false });
    }

    console.log("Report found, returning content for date:", date);
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
