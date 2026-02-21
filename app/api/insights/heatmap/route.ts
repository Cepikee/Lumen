import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// --- Kategória tisztító függvény (ugyanaz, mint a timeseries-ben) ---
function fixCat(s: any): string | null {
  if (!s) return null;

  let t = String(s).replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!t) return null;

  if (/[├â├ę├╝├║]/.test(t)) {
    try {
      t = Buffer.from(t, "latin1").toString("utf8").trim();
    } catch {}
  }

  return t || null;
}

export async function GET() {
  try {
    // --- 1) Kategóriák lekérése ---
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM summaries
      WHERE category IS NOT NULL AND category <> ''
    `);

    const categories = Array.from(
      new Map(
        (cats || [])
          .map((c: any) => fixCat(c.category))
          .filter(Boolean)
          .map((c: string) => [c.toLowerCase(), c])
      ).values()
    );

    // --- 2) Órák listája (0–23) ---
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // --- 3) Alap mátrix 0-val kitöltve ---
    const matrix: Record<string, Record<number, number>> = {};
    for (const cat of categories) {
      matrix[cat as string] = {};
      for (const h of hours) {
        matrix[cat as string][h] = 0;
      }
    }

    // --- 4) Mai nap időintervalluma ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 19).replace("T", " ");

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace("T", " ");

    // --- 5) Fő SQL lekérdezés: kategória × óra × count ---
    const [rows]: any = await db.query(
      `
      SELECT 
        TRIM(category) AS category,
        HOUR(created_at) AS hour,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category), HOUR(created_at)
      ORDER BY TRIM(category), hour
      `,
      [todayStr, tomorrowStr]
    );

    // --- 6) Mátrix feltöltése ---
    for (const r of rows) {
      const cat = fixCat(r.category);
      if (!cat) continue;

      const hour = Number(r.hour);
      const count = Number(r.count) || 0;

      if (matrix[cat as string] && hour >= 0 && hour <= 23) {
        matrix[cat as string][hour] = count;
      }
    }

    // --- 7) Válasz ---
    return NextResponse.json({
      success: true,
      categories,
      hours,
      matrix,
    });

  } catch (err) {
    console.error("Heatmap API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
