// app/api/insights/heatmap/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security"; // ⭐ központi védelem
import { businessDayBounds, hourInZone, mysqlUtc } from "@/lib/business-time";

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

export async function GET(req: Request) {
  try {
    // ⭐ KÖZPONTI SECURITY CHECK
    const sec = await securityCheck(req);
    if (sec) return sec;

    // --- 1) Kategóriák lekérése ---
    const [cats]: any = await db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM summaries
      WHERE category IS NOT NULL AND TRIM(category) <> ''
    `);

    const categories = Array.from(
      new Map(
        (cats || [])
          .map((c: any) => fixCat(c.category))
          .filter(
            (x: string | null): x is string =>
              typeof x === "string" && x.length > 0
          )
          .map((c: string) => [c.toLowerCase(), c])
      ).values()
    ) as string[];

    // --- 2) Órák listája ---
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // --- 3) Alap mátrix ---
    const matrix: Record<string, Record<number, number>> = {};

    for (const cat of categories) {
      matrix[cat] = {};
      for (const h of hours) {
        matrix[cat][h] = 0;
      }
    }

    // --- 4) Mai nap intervalluma ---
    const bounds = businessDayBounds(new Date());
    const startStr = mysqlUtc(bounds.start);
    const endStr = mysqlUtc(bounds.end);

    // --- 5) Bucket-alapú SQL ---
    const [rows]: any = await db.query(
      `
      SELECT 
        MIN(TRIM(category)) AS category,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND category IS NOT NULL
        AND TRIM(category) <> ''
      GROUP BY LOWER(TRIM(category)), bucket
      ORDER BY bucket ASC
      `,
      [startStr, endStr]
    );

    // --- 6) Mátrix feltöltése ---
    for (const r of rows) {
      const cat = fixCat(r.category);
      if (!cat) continue;
      const target = categories.find((value) => value.toLowerCase() === cat.toLowerCase());
      if (!target) continue;

      const hour = hourInZone(new Date(`${String(r.bucket).replace(" ", "T")}Z`));
      const count = Number(r.count) || 0;

      if (matrix[target] && hour >= 0 && hour <= 23) {
        // A DST őszi visszaállításakor ugyanaz a helyi óra két UTC bucketből
        // állhat; ilyenkor a két bucketet össze kell adni, nem felülírni.
        matrix[target][hour] += count;
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
