// app/api/insights/trending-keywords/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security"; // ⭐ központi védelem

// --- Kulcsszó tisztító ---
function cleanKeyword(s: string): string {
  return s
    .replace(/[\[\]"']/g, "")
    .trim()
    .toLowerCase();
}

// --- Spike szint meghatározása ---
function getSpikeLevel(count: number) {
  if (count >= 7) return "brutal";
  if (count >= 5) return "strong";
  if (count >= 3) return "mild";
  return null;
}

export async function GET(req: Request) {
  // ⭐ KÖZPONTI SECURITY CHECK
  const sec = securityCheck(req);
  if (sec) return sec;

  try {
    // --- 1) Mai nap intervalluma ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 19).replace("T", " ");

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace("T", " ");

    // --- 2) Lekérjük a mai trend_keywords mezőket ---
    const [rows]: any = await db.query(
      `
      SELECT trend_keywords
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND trend_keywords IS NOT NULL
        AND trend_keywords <> ''
      `,
      [todayStr, tomorrowStr]
    );

    const keywordCount: Record<string, number> = {};

    // --- 3) Split + normalizálás + számlálás ---
    for (const row of rows) {
      const raw = row.trend_keywords || "";
      const parts = raw.split(",").map(cleanKeyword).filter(Boolean);

      for (const kw of parts) {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      }
    }

    // --- 4) Minimum előfordulás = 3 ---
    const filtered = Object.entries(keywordCount)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    // --- 5) Küszöb szerinti besorolás ---
    const keywords = filtered.map(([kw, count]) => ({
      keyword: kw,
      count,
      level: getSpikeLevel(count),
    }));

    // --- 6) Válasz ---
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
