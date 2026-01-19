import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ keyword: string }> }
) {
  try {
    const { keyword } = await context.params;
    const decodedKeyword = decodeURIComponent(keyword);

    // 1) META — trends tábla használata
    const [metaRows] = await db.query(
      `
      SELECT 
        t.keyword,
        a.category AS category,
        COUNT(DISTINCT t.article_id) AS total_articles,
        COUNT(DISTINCT a.source) AS source_diversity,
        MAX(a.created_at) AS last_article_at
      FROM trends t
      JOIN articles a ON a.id = t.article_id
      WHERE t.keyword = ?
      GROUP BY t.keyword, a.category
      `,
      [decodedKeyword]
    );

    if (!metaRows || (metaRows as any[]).length === 0) {
      return NextResponse.json({ success: false });
    }

    const meta = (metaRows as any[])[0];

    // 2) SPARKLINE — trends tábla
    const [sparkRows] = await db.query(
      `
      SELECT 
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:00:00') AS bucket,
        COUNT(*) AS article_count
      FROM trends t
      JOIN articles a ON a.id = t.article_id
      WHERE t.keyword = ?
        AND a.created_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY bucket
      ORDER BY bucket
      `,
      [decodedKeyword]
    );

    const sparklineData = (sparkRows as any[]).map((row) => ({
      bucket: row.bucket,
      count: row.article_count,
    }));

    // 3) SOURCE DOMINANCE — trends tábla
    const [sourceRows] = await db.query(
      `
      SELECT 
        a.source,
        COUNT(*) AS article_count
      FROM trends t
      JOIN articles a ON a.id = t.article_id
      WHERE t.keyword = ?
        AND DATE(a.created_at) = CURDATE()
      GROUP BY a.source
      ORDER BY article_count DESC
      `,
      [decodedKeyword]
    );

    const totalSourceArticles = (sourceRows as any[]).reduce(
      (sum, r) => sum + r.article_count,
      0
    );

    const sourceDominance = (sourceRows as any[]).map((r) => ({
      source: r.source,
      count: r.article_count,
      percent: totalSourceArticles
        ? Math.round((r.article_count / totalSourceArticles) * 100)
        : 0,
    }));

    // 4) RELATED ARTICLES — trends tábla
    const [articleRows] = await db.query(
      `
      SELECT 
        a.id,
        a.title,
        a.url_canonical,
        a.source,
        a.created_at,
        a.category
      FROM trends t
      JOIN articles a ON a.id = t.article_id
      WHERE t.keyword = ?
      ORDER BY a.created_at DESC
      LIMIT 20
      `,
      [decodedKeyword]
    );

    // 5) RELATED TRENDS — trends tábla
    const [relatedTrendRows] = await db.query(
      `
      SELECT 
        t2.keyword,
        a2.category AS category,
        COUNT(DISTINCT t2.article_id) AS article_count
      FROM trends t1
      JOIN trends t2 
        ON t1.article_id = t2.article_id 
        AND t2.keyword != t1.keyword
      JOIN articles a2 ON a2.id = t2.article_id
      WHERE t1.keyword = ?
      GROUP BY t2.keyword, a2.category
      ORDER BY article_count DESC
      LIMIT 10
      `,
      [decodedKeyword]
    );

    // 6) TrendScore
    const recentActivityScore = Math.min(meta.total_articles / 10, 1);
    const sourceDiversityScore = Math.min(meta.source_diversity / 5, 1);

    const trendScore =
      0.5 * recentActivityScore +
      0.5 * sourceDiversityScore;

    return NextResponse.json({
      success: true,
      keyword: decodedKeyword,
      trendScore: Math.round(trendScore * 100),
      meta,
      sparklineData,
      sourceDominance,
      relatedArticles: articleRows,
      relatedTrends: relatedTrendRows,
    });

  } catch (err: any) {
    console.error("INSIGHT DETAIL ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
