// app/api/insights/clickbait/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

// --- Kategória tisztító (ugyanaz, mint máshol) ---
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
    // ⭐ SECURITY CHECK
    const sec = securityCheck(req);
    if (sec) return sec;

    // ─────────────────────────────────────────────
    // 1) Forrásonkénti átlag clickbait
    // ─────────────────────────────────────────────
    const [sourceRows]: any = await db.query(`
      SELECT 
        source,
        AVG(final_clickbait) AS avg_clickbait,
        COUNT(*) AS count
      FROM summaries
      WHERE final_clickbait IS NOT NULL
      GROUP BY source
      ORDER BY avg_clickbait DESC
    `);

    // ─────────────────────────────────────────────
    // 2) Kategóriánkénti átlag clickbait
    // ─────────────────────────────────────────────
    const [catRows]: any = await db.query(`
      SELECT 
        TRIM(category) AS category,
        AVG(final_clickbait) AS avg_clickbait,
        COUNT(*) AS count
      FROM summaries
      WHERE final_clickbait IS NOT NULL
        AND category IS NOT NULL
        AND category <> ''
      GROUP BY TRIM(category)
      ORDER BY avg_clickbait DESC
    `);

    const categories = catRows.map((r: any) => ({
      category: fixCat(r.category),
      avg_clickbait: Number(r.avg_clickbait) || 0,
      count: Number(r.count) || 0
    }));

    // ─────────────────────────────────────────────
    // 3) 24 órás clickbait trend (óránként)
    // ─────────────────────────────────────────────
    const now = new Date();
    const endStr = now.toISOString().slice(0, 19).replace("T", " ");

    const startUtc = new Date(now.getTime());
    startUtc.setHours(startUtc.getHours() - 24);
    const startStr = startUtc.toISOString().slice(0, 19).replace("T", " ");

    const [trendRows]: any = await db.query(
      `
      SELECT 
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        AVG(final_clickbait) AS avg_clickbait,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at <= ?
        AND final_clickbait IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [startStr, endStr]
    );

    const trend = trendRows.map((r: any) => ({
      hour: r.bucket,
      avg_clickbait: Number(r.avg_clickbait) || 0,
      count: Number(r.count) || 0
    }));

    // ─────────────────────────────────────────────
    // 4) Top 20 legclickbaitebb cikk
    // ─────────────────────────────────────────────
    const [topRows]: any = await db.query(`
      SELECT 
        article_id,
        title_clickbait,
        content_clickbait,
        consistency_clickbait,
        final_clickbait,
        created_at
      FROM summaries
      WHERE final_clickbait IS NOT NULL
      ORDER BY final_clickbait DESC
      LIMIT 20
    `);

    // ─────────────────────────────────────────────
    // 5) Összesített statisztikák
    // ─────────────────────────────────────────────
    const [statsRows]: any = await db.query(`
      SELECT 
        AVG(final_clickbait) AS avg_clickbait,
        MIN(final_clickbait) AS min_clickbait,
        MAX(final_clickbait) AS max_clickbait,
        COUNT(*) AS total
      FROM summaries
      WHERE final_clickbait IS NOT NULL
    `);

    const stats = {
      avg: Number(statsRows[0].avg_clickbait) || 0,
      min: Number(statsRows[0].min_clickbait) || 0,
      max: Number(statsRows[0].max_clickbait) || 0,
      total: Number(statsRows[0].total) || 0
    };

    // ─────────────────────────────────────────────
    // VÁLASZ
    // ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      sources: sourceRows,
      categories,
      trend,
      top: topRows,
      stats
    });

  } catch (err) {
    console.error("Clickbait API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
