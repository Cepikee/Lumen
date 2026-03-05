// app/api/insights/sentiment/timeline/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

    const start = `${day} 00:00:00`;
    const end = `${day} 23:59:59`;

    const [rows]: any = await db.query(
      `
      SELECT 
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        sentiment,
        COUNT(*) AS c
      FROM articles
      WHERE created_at >= ? AND created_at <= ?
        AND sentiment IS NOT NULL
      GROUP BY bucket, sentiment
      ORDER BY bucket ASC
      `,
      [start, end]
    );

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const timeline = hours.map(h => ({
      hour: h,
      positive: 0,
      neutral: 0,
      negative: 0
    }));

    for (const r of rows) {
      const hour = new Date(r.bucket).getHours();
      if (hour < 0 || hour > 23) continue;

      if (r.sentiment === 1) timeline[hour].positive = r.c;
      else if (r.sentiment === 0) timeline[hour].neutral = r.c;
      else if (r.sentiment === -1) timeline[hour].negative = r.c;
    }

    return NextResponse.json({
      success: true,
      timeline
    });

  } catch (err) {
    console.error("Sentiment timeline API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
