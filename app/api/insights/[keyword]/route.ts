import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, context: any) {
  try {
    const rawKeyword = context?.params?.keyword;

    if (!rawKeyword || rawKeyword === "undefined") {
      console.error("INVALID KEYWORD PARAM:", rawKeyword);
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const decodedKeyword = decodeURIComponent(rawKeyword);
    const keyword = decodedKeyword.trim();

    // DEBUG: log a beérkező keyword és hex reprezentáció (töröld élesben ha nem kell)
    console.info("INSIGHT KEYWORD:", { rawKeyword, decodedKeyword, keyword });
    try {
      const [hexRows] = await db.query(
        `SELECT HEX(?) AS hex_param`,
        [keyword]
      );
      console.info("KEYWORD HEX PARAM:", (hexRows as any[])[0]?.hex_param);
    } catch (e) {
      // ignore hex debug failure
    }

    // META
    const [metaRows] = await db.query(
      `
      SELECT 
        NULL AS category,
        k.keyword,
        COUNT(DISTINCT k.article_id) AS total_articles,
        COUNT(DISTINCT a.source) AS source_diversity,
        MAX(a.created_at) AS last_article_at
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE k.keyword = ?
      GROUP BY k.keyword
      `,
      [keyword]
    );

    if (!metaRows || (metaRows as any[]).length === 0) {
      console.warn("META ROWS EMPTY for keyword:", keyword);
      return NextResponse.json({ success: false });
    }

    const meta = (metaRows as any[])[0];

    // SPARKLINE
    const [sparkRows] = await db.query(
      `
      SELECT 
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:00:00') AS bucket,
        COUNT(*) AS article_count
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE k.keyword = ?
        AND a.created_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY bucket
      ORDER BY bucket
      `,
      [keyword]
    );

    const sparklineData = (sparkRows as any[]).map((row) => ({
      bucket: row.bucket,
      count: row.article_count,
    }));

    // SOURCE DOMINANCE
    const [sourceRows] = await db.query(
      `
      SELECT 
        a.source,
        COUNT(*) AS article_count
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE k.keyword = ?
        AND DATE(a.created_at) = CURDATE()
      GROUP BY a.source
      ORDER BY article_count DESC
      `,
      [keyword]
    );

    const totalSourceArticles = (sourceRows as any[]).reduce(
      (sum, r) => sum + (r.article_count || 0),
      0
    );

    const sourceDominance = (sourceRows as any[]).map((r) => ({
      source: r.source,
      count: r.article_count,
      percent: totalSourceArticles
        ? Math.round((r.article_count / totalSourceArticles) * 100)
        : 0,
    }));

    // RELATED ARTICLES
    const [articleRows] = await db.query(
      `
      SELECT 
        a.id,
        a.title,
        a.url_canonical,
        a.source,
        a.created_at,
        a.category
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE k.keyword = ?
      ORDER BY a.created_at DESC
      LIMIT 20
      `,
      [keyword]
    );

    // RELATED TRENDS
    const [relatedTrendRows] = await db.query(
      `
      SELECT 
        k2.keyword,
        COUNT(DISTINCT k2.article_id) AS article_count
      FROM keywords k1
      JOIN keywords k2 
        ON k1.article_id = k2.article_id 
        AND k2.keyword != k1.keyword
      WHERE k1.keyword = ?
      GROUP BY k2.keyword
      ORDER BY article_count DESC
      LIMIT 10
      `,
      [keyword]
    );

    const filteredTrends = (relatedTrendRows as any[]).filter(
      (t) => t?.keyword && t.keyword !== "undefined"
    );

    // TrendScore
    const recentActivityScore = Math.min(meta.total_articles / 10, 1);
    const sourceDiversityScore = Math.min(meta.source_diversity / 5, 1);

    const trendScore =
      0.5 * recentActivityScore +
      0.5 * sourceDiversityScore;

    return NextResponse.json({
      success: true,
      keyword,
      trendScore: Math.round(trendScore * 100),
      meta,
      sparklineData,
      sourceDominance,
      relatedArticles: articleRows,
      relatedTrends: filteredTrends,
    });
  } catch (err: any) {
    console.error("INSIGHT DETAIL ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
