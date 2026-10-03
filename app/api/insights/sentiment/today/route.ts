// app/api/insights/sentiment/today/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    const bounds = businessDayBounds(new Date());
    const start = mysqlUtc(bounds.start);
    const end = mysqlUtc(bounds.end);

    const [rows]: any = await db.query(
      `
      SELECT sentiment, COUNT(*) AS c
      FROM articles
      WHERE published_at >= ? AND published_at < ?
        AND sentiment IS NOT NULL
      GROUP BY sentiment
      `,
      [start, end]
    );

    let positive = 0, neutral = 0, negative = 0;

    for (const r of rows) {
      const count = Number(r.c);
      if (!Number.isFinite(count) || count < 0) continue;
      const sentiment = Number(r.sentiment);
      if (sentiment === 1) positive += count;
      else if (sentiment === 0) neutral += count;
      else if (sentiment === -1) negative += count;
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
