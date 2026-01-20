import { NextResponse } from "next/server";
import { db } from "@/lib/db";



export async function GET(req: Request, context: any) {
  try {
    const { keyword } = context.params as { keyword: string };
    const decodedKeyword = decodeURIComponent(keyword);

    // 1) META — keywords tábla
    const [metaRows] = await db.query(
      `
      SELECT 
        k.keyword,
        a.category AS category,
        COUNT(DISTINCT k.article_id) AS total_articles,
        COUNT(DISTINCT a.source) AS source_diversity,
        MAX(a.created_at) AS last_article_at
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE k.keyword = ?
      GROUP BY k.keyword, a.category
      `,
      [decodedKeyword]
    );

    if (!metaRows || (metaRows as any[]).length === 0) {
      return NextResponse.json({ success: false });
    }

    const meta = (metaRows as any[])[0];

    // 2) SPARKLINE — keywords tábla
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
      [decodedKeyword]
    );

    const sparklineData = (sparkRows as any[]).map((row) => ({
      bucket: row.bucket,
      count: row.article_count,
    }));

    // 3) SOURCE DOMINANCE — keywords tábla
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

    // 4) RELATED ARTICLES — keywords tábla
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
      [decodedKeyword]
    );

    // 5) RELATED TRENDS — keywords tábla
    const [relatedTrendRows] = await db.query(
      `
      SELECT 
        k2.keyword,
        a2.category AS category,
        COUNT(DISTINCT k2.article_id) AS article_count
      FROM keywords k1
      JOIN keywords k2 
        ON k1.article_id = k2.article_id 
        AND k2.keyword != k1.keyword
      JOIN articles a2 ON a2.id = k2.article_id
      WHERE k1.keyword = ?
      GROUP BY k2.keyword, a2.category
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


console.log("RAW PARAM:", context.params.keyword);
console.log("DECODED:", decodeURIComponent(context.params.keyword));
console.log("SQL PARAM:", decodedKeyword);
console.log("SQL PARAM HEX:", Buffer.from(decodedKeyword).toString("hex"));

  } catch (err: any) {
    console.error("INSIGHT DETAIL ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
