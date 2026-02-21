import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// --- Kategória tisztító (ugyanaz, mint a timeseries-ben) ---
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

    // TS FIX: explicit paraméter típus + type guard
    const categories = Array.from(
      new Map(
        (cats || [])
          .map((c: any) => fixCat(c.category))
          .filter((x: string | null): x is string => typeof x === "string" && x.length > 0)
          .map((c: string) => [c.toLowerCase(), c])
      ).values()
    ) as string[];

    // --- 2) Órák listája ---
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // --- 3) Alap mátrix típusozva ---
    const matrix: Record<string, Record<number, number>> = {};

    for (const cat of categories) {
      matrix[cat] = {};
      for (const h of hours) {
        matrix[cat][h] = 0;
      }
    }

    // --- 4) Mai nap intervalluma (ugyanaz, mint a timeseries-ben) ---
    const now = new Date();
    const endStr = now.toISOString().slice(0, 19).replace("T", " ");

    const startUtc = new Date(now.getTime());
    startUtc.setHours(0, 0, 0, 0);
    const startStr = startUtc.toISOString().slice(0, 19).replace("T", " ");

    // --- 5) Bucket-alapú SQL (Chart.js kompatibilis) ---
    const [rows]: any = await db.query(
      `
      SELECT 
        TRIM(category) AS category,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at <= ?
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category), bucket
      ORDER BY bucket ASC
      `,
      [startStr, endStr]
    );

    // --- 6) Mátrix feltöltése ---
    for (const r of rows) {
      const cat = fixCat(r.category);
      if (!cat) continue;

      const hour = new Date(r.bucket).getHours();
      const count = Number(r.count) || 0;

      if (matrix[cat] && hour >= 0 && hour <= 23) {
        matrix[cat][hour] = count;
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
