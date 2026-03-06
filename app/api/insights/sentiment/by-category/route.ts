// app/api/insights/sentiment/by-category/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

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
    const sec = securityCheck(req);
    if (sec) return sec;

    // 🔥 Mai nap meghatározása
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const start = `${day} 00:00:00`;
    const end = `${day} 23:59:59`;

    // 🔥 Csak a MA publikált cikkek
    const [rows]: any = await db.query(
      `
      SELECT 
        TRIM(category) AS category,
        sentiment,
        COUNT(*) AS c
      FROM articles
      WHERE published_at >= ? AND published_at <= ?
        AND sentiment IS NOT NULL
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category), sentiment
      `,
      [start, end]
    );

    const result: Record<string, { positive: number; neutral: number; negative: number }> = {};

    for (const r of rows) {
      const cat = fixCat(r.category);
      if (!cat) continue;

      if (!result[cat]) {
        result[cat] = { positive: 0, neutral: 0, negative: 0 };
      }

      if (r.sentiment === 1) result[cat].positive = r.c;
      else if (r.sentiment === 0) result[cat].neutral = r.c;
      else if (r.sentiment === -1) result[cat].negative = r.c;
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
