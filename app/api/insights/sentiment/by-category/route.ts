// app/api/insights/sentiment/by-category/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { resolveInsightsWindow } from "@/lib/insights-period";
import { businessDayBounds, mysqlUtc } from "@/lib/business-time";

function fixCat(s: any): string | null {
  if (!s) return null;
  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;
  if (/[├â├ę├╝├║]/.test(t)) {
    try { t = Buffer.from(t, "latin1").toString("utf8").trim(); } catch {}
  }
  return t || null;
}

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    // 🔥 Mai nap meghatározása
    const period = new URL(req.url).searchParams.get("period");
    if (period !== null && !["24h", "7d", "30d", "90d"].includes(period)) {
      return NextResponse.json({ success: false, error: "invalid_period" }, { status: 400 });
    }
    // No parameter keeps the existing Budapest calendar-day contract.
    const bounds = period ? resolveInsightsWindow(period) : businessDayBounds(new Date());
    const start = mysqlUtc(bounds.start);
    const end = mysqlUtc(bounds.end);

    // 🔥 Csak a MA publikált cikkek
    const [rows]: any = await db.query(
      `
      SELECT 
        MIN(TRIM(category)) AS category,
        sentiment,
        COUNT(*) AS c
      FROM articles
      WHERE published_at >= ? AND published_at < ?
        AND sentiment IS NOT NULL
        AND category IS NOT NULL
        AND TRIM(category) <> ''
      GROUP BY LOWER(TRIM(category)), sentiment
      `,
      [start, end]
    );

    const result: Record<string, { positive: number; neutral: number; negative: number }> = {};

    for (const r of rows) {
      const cat = fixCat(r.category);
      if (!cat) continue;

      const key = cat.toLocaleLowerCase("hu-HU");
      const existing = Object.keys(result).find((label) => label.toLocaleLowerCase("hu-HU") === key);
      const resultKey = existing ?? cat;
      if (!result[resultKey]) {
        result[resultKey] = { positive: 0, neutral: 0, negative: 0 };
      }

      const count = Number(r.c);
      if (!Number.isFinite(count) || count < 0) continue;
      const sentiment = Number(r.sentiment);
      if (sentiment === 1) result[resultKey].positive += count;
      else if (sentiment === 0) result[resultKey].neutral += count;
      else if (sentiment === -1) result[resultKey].negative += count;
    }

    return NextResponse.json({
      success: true,
      categories: result
    });

  } catch (err) {
    console.error("Sentiment by-category API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
