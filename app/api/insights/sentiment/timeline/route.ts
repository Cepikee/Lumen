// app/api/insights/sentiment/timeline/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { resolveInsightsWindow } from "@/lib/insights-period";
import { businessDayBounds, hourInZone, mysqlUtc } from "@/lib/business-time";

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    const period = new URL(req.url).searchParams.get("period");
    if (period !== null && !["today", "24h", "7d", "30d", "90d"].includes(period)) {
      return NextResponse.json({ success: false, error: "invalid_period" }, { status: 400 });
    }
    // No parameter keeps the existing Budapest calendar-day contract.
    const bounds = period ? resolveInsightsWindow(period) : businessDayBounds(new Date());
    const start = mysqlUtc(bounds.start);
    const end = mysqlUtc(bounds.end);

    const [rows]: any = await db.query(
      `
      SELECT 
        DATE_FORMAT(published_at, "%Y-%m-%d %H:00:00") AS bucket,
        sentiment,
        COUNT(*) AS c
      FROM articles
      WHERE published_at >= ? AND published_at < ?
        AND sentiment IS NOT NULL
      GROUP BY bucket, sentiment
      ORDER BY bucket ASC
      `,
      [start, end]
    );

    if (period) {
      const buckets = new Map<string, { date: string; positive: number; neutral: number; negative: number }>();
      for (const r of rows) {
        const date = new Date(String(r.bucket).replace(" ", "T") + "Z");
        const count = Number(r.c);
        const sentiment = Number(r.sentiment);
        if (!Number.isFinite(date.getTime()) || !Number.isFinite(count) || count < 0 || ![-1, 0, 1].includes(sentiment)) continue;
        const key = date.toISOString();
        const point = buckets.get(key) ?? { date: key, positive: 0, neutral: 0, negative: 0 };
        if (sentiment === 1) point.positive += count;
        else if (sentiment === -1) point.negative += count;
        else point.neutral += count;
        buckets.set(key, point);
      }
      return NextResponse.json({ success: true, period, timeline: [...buckets.values()] });
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const timeline = hours.map(h => ({
      hour: h,
      positive: 0,
      neutral: 0,
      negative: 0
    }));

    for (const r of rows) {
      const hour = hourInZone(new Date(`${String(r.bucket).replace(" ", "T")}Z`));
      if (hour < 0 || hour > 23) continue;

      const count = Number(r.c);
      if (!Number.isFinite(count) || count < 0) continue;
      if (Number(r.sentiment) === 1) timeline[hour].positive += count;
      else if (Number(r.sentiment) === 0) timeline[hour].neutral += count;
      else if (Number(r.sentiment) === -1) timeline[hour].negative += count;
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
