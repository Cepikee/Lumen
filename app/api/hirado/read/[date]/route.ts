import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const param = url.pathname.split("/").pop() || "";

  console.log("READ API called, raw param:", param);

  let date: string | null = null;

  // ha szám → videó ID
  if (/^\d+$/.test(param)) {
    // Kérdezzük le SQL-ben a DATE() értéket, hogy elkerüljük a JS időzóna problémáit
    const result = await db.query(
      "SELECT DATE(date) AS dateOnly, date, video_date, created_at FROM videos WHERE id = ? LIMIT 1",
      [param]
    );

    const rows: any[] = JSON.parse(JSON.stringify(result[0]));
    console.log("video row from DB:", rows);

    const v = rows[0];
    if (v?.dateOnly) {
      date = String(v.dateOnly); // pl. '2026-01-28'
      console.log("using dateOnly from DB:", date);
    } else if (v?.date) {
      // fallback: ha nincs dateOnly, próbáljuk JS-sel (logoljuk)
      date = new Date(v.date).toISOString().split("T")[0];
      console.log("fallback computed date from v.date:", date);
    }
  }

  // ha YYYY-MM-DD → dátum
  if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
    date = param;
    console.log("param is direct date:", date);
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

  const rep: any[] = JSON.parse(JSON.stringify(result2[0]));
  console.log("daily_reports query result:", rep);

  if (!rep.length) {
    console.log("No report found for date:", date);
    return NextResponse.json({ hasReport: false });
  }

  console.log("Report found, returning content for date:", date);
  return NextResponse.json({
    hasReport: true,
    content: rep[0].content,
  });
}
