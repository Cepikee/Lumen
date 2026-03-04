// app/api/insights/trending-keywords/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

function cleanKeyword(s: string): string {
  return s.replace(/[\[\]"']/g, "").trim().toLowerCase();
}

function getSpikeLevel(count: number) {
  if (count >= 7) return "brutal";
  if (count >= 5) return "strong";
  if (count >= 3) return "mild";
  return null;
}

export async function GET(req: Request) {
  const sec = securityCheck(req);
  if (sec) return sec;

  try {
    // HELYI IDŐ – mai nap 00:00:00 → 23:59:59
    const now = new Date();

    const todayStr =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")} 00:00:00`;

    const tomorrowStr =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")} 23:59:59`;

    const [rows]: any = await db.query(
      `
      SELECT trend_keywords
      FROM summaries
      WHERE created_at >= ?
        AND created_at <= ?
        AND trend_keywords IS NOT NULL
        AND trend_keywords <> ''
      `,
      [todayStr, tomorrowStr]
    );

    const keywordCount: Record<string, number> = {};

    for (const row of rows) {
      const raw = row.trend_keywords || "";
      const parts = raw.split(",").map(cleanKeyword).filter(Boolean);

      for (const kw of parts) {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      }
    }

    const filtered = Object.entries(keywordCount)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const keywords = filtered.map(([kw, count]) => ({
      keyword: kw,
      count,
      level: getSpikeLevel(count),
    }));

    return NextResponse.json({
      success: true,
      keywords,
    });

  } catch (err) {
    console.error("Trending Keywords API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
