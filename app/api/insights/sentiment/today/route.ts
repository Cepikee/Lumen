// app/api/insights/sentiment/today/route.ts
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
      SELECT sentiment, COUNT(*) AS c
      FROM articles
      WHERE created_at >= ? AND created_at <= ?
        AND sentiment IS NOT NULL
      GROUP BY sentiment
      `,
      [start, end]
    );

    let positive = 0, neutral = 0, negative = 0;

    for (const r of rows) {
      if (r.sentiment === 1) positive = r.c;
      else if (r.sentiment === 0) neutral = r.c;
      else if (r.sentiment === -1) negative = r.c;
    }

    const total = positive + neutral + negative || 1;

    return NextResponse.json({
      success: true,
      positive,
      neutral,
      negative,
      ratio: {
        positive: positive / total,
        neutral: neutral / total,
        negative: negative / total
      }
    });

  } catch (err) {
    console.error("Sentiment Today API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
