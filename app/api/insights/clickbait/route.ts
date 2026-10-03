// app/api/insights/clickbait/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { mysqlUtc } from "@/lib/business-time";

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
    const sec = await securityCheck(req);
    if (sec) return sec;

    const [sourceRows]: any = await db.query(`
      SELECT 
        COALESCE(NULLIF(LOWER(TRIM(source)), ''), 'ismeretlen') AS source,
        AVG(final_clickbait) AS avg_clickbait,
        COUNT(*) AS count
      FROM summaries
      WHERE final_clickbait IS NOT NULL
      GROUP BY COALESCE(NULLIF(LOWER(TRIM(source)), ''), 'ismeretlen')
      ORDER BY avg_clickbait DESC, source ASC
    `);

    const [catRows]: any = await db.query(`
      SELECT 
        MIN(TRIM(category)) AS category,
        AVG(final_clickbait) AS avg_clickbait,
        COUNT(*) AS count
      FROM summaries
      WHERE final_clickbait IS NOT NULL
        AND category IS NOT NULL
        AND TRIM(category) <> ''
      GROUP BY LOWER(TRIM(category))
      ORDER BY avg_clickbait DESC
    `);

    const categories = catRows.map((r: any) => ({
      category: fixCat(r.category),
      avg_clickbait: Number(r.avg_clickbait) || 0,
      count: Number(r.count) || 0
    }));

    const now = new Date();
    const endStr = mysqlUtc(now);
    const startStr = mysqlUtc(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    const [trendRows]: any = await db.query(
      `
      SELECT 
        DATE_FORMAT(created_at, "%Y-%m-%d %H:00:00") AS bucket,
        AVG(final_clickbait) AS avg_clickbait,
        COUNT(*) AS count
      FROM summaries
      WHERE created_at >= ?
        AND created_at < ?
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

    const sources = sourceRows.map((row: any) => ({
      source: typeof row.source === "string" && row.source.trim() ? row.source : "ismeretlen",
      avg_clickbait: Number.isFinite(Number(row.avg_clickbait)) ? Number(row.avg_clickbait) : 0,
      count: Number.isFinite(Number(row.count)) ? Number(row.count) : 0,
    }));

    return NextResponse.json({
      success: true,
      sources,
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
