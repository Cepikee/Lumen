import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const param = url.pathname.split("/").pop() || "";

    // ha YYYY-MM-DD → közvetlen dátumos keresés
    if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
      const date = param;
      const [year, month, day] = date.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 });
      }
      const r = await db.query(
        "SELECT id, report_date, content FROM daily_reports WHERE DATE(report_date) = ? ORDER BY report_date DESC, id DESC LIMIT 1",
        [date]
      );
      const rows: any[] = JSON.parse(JSON.stringify(r[0] || []));
      if (!rows.length) return NextResponse.json({ hasReport: false });
      return NextResponse.json({ hasReport: true, content: rows[0].content });
    }

    // ha szám → videó ID: JOIN a daily_reports-szal a videos.date alapján
    if (/^\d+$/.test(param) && Number.isSafeInteger(Number(param)) && Number(param) > 0) {
      const vid = param;
      const r = await db.query(
        `SELECT dr.content
         FROM daily_reports dr
         JOIN videos v ON DATE(dr.report_date) = DATE(v.date)
         WHERE v.id = ?
         ORDER BY dr.report_date DESC, dr.id DESC
         LIMIT 1`,
        [vid]
      );
      const rows: any[] = JSON.parse(JSON.stringify(r[0] || []));
      if (!rows.length) return NextResponse.json({ hasReport: false });
      return NextResponse.json({ hasReport: true, content: rows[0].content });
    }

    if (/^\d+$/.test(param)) {
      return NextResponse.json({ hasReport: false, error: "INVALID_VIDEO_ID" }, { status: 400 });
    }

    // A route csak ISO dátumot vagy pozitív videóazonosítót fogad. A hibás
    // path-paramétert ne kezeljük üres, sikeres olvasásként, mert a kliens
    // így könnyen eltünteti a valódi navigációs hibát.
    return NextResponse.json(
      { hasReport: false, error: "INVALID_REPORT_PARAMETER" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("READ API unexpected error:", err && err.stack ? err.stack : err);
    return new NextResponse(JSON.stringify({ hasReport: false, error: "internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
