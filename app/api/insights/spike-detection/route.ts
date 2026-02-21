import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// --- Szöveg tisztító ---
function fixText(s: any): string | null {
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

// --- Spike szint ---
function getSpikeLevel(count: number) {
  if (count >= 7) return "brutal";
  if (count >= 5) return "strong";
  if (count >= 3) return "mild";
  return null;
}

export async function GET() {
  try {
    // --- 1) Mai nap intervalluma ---
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const startStr = start.toISOString().slice(0, 19).replace("T", " ");
    const endStr = end.toISOString().slice(0, 19).replace("T", " ");

    const spikes: any[] = [];

    // ============================================================
    // 2) KATEGÓRIA SPIKE — bucket alapú, Chart.js kompatibilis
    // ============================================================
    const [catRows]: any = await db.query(
      `
      SELECT 
        TRIM(category) AS category,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category), bucket
      HAVING count >= 3
      ORDER BY count DESC
      LIMIT 20
      `,
      [startStr, endStr]
    );

    for (const r of catRows) {
      const cat = fixText(r.category);
      if (!cat) continue;

      const hour = new Date(r.bucket).getHours();
      const level = getSpikeLevel(r.count);
      if (!level) continue;

      spikes.push({
        type: "category",
        label: cat,
        hour,
        value: Number(r.count),
        level,
      });
    }

    // ============================================================
    // 3) FORRÁS SPIKE — bucket alapú
    // ============================================================
    const [srcRows]: any = await db.query(
      `
      SELECT 
        TRIM(source) AS source,
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
        AND source IS NOT NULL
        AND source <> ''
      GROUP BY TRIM(source), bucket
      HAVING count >= 3
      ORDER BY count DESC
      LIMIT 20
      `,
      [startStr, endStr]
    );

    for (const r of srcRows) {
      const src = fixText(r.source);
      if (!src) continue;

      const hour = new Date(r.bucket).getHours();
      const level = getSpikeLevel(r.count);
      if (!level) continue;

      spikes.push({
        type: "source",
        label: src,
        hour,
        value: Number(r.count),
        level,
      });
    }

    // ============================================================
    // 4) TOP 10 spike visszaadása
    // ============================================================
    const topSpikes = spikes
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      spikes: topSpikes,
    });

  } catch (err) {
    console.error("Spike Detection API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
