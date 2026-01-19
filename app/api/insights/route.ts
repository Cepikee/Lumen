import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 20);

    // TOP TRENDS lekérdezés
    const [rows] = await db.query(
      `
      SELECT 
        k.keyword,
        k.category,
        COUNT(DISTINCT k.article_id) AS article_count,
        COUNT(DISTINCT a.source) AS source_diversity,
        MAX(a.created_at) AS last_article_at
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE a.created_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY k.keyword, k.category
      HAVING article_count >= 3
      ORDER BY article_count DESC, last_article_at DESC
      LIMIT ?
      `,
      [limit]
    );

    // TrendScore v1 számítás
    const trends = (rows as any[]).map((t) => {
      const recentActivityScore = Math.min(t.article_count / 10, 1);
      const sourceDiversityScore = Math.min(t.source_diversity / 5, 1);

      const trendScore =
        0.5 * recentActivityScore +
        0.5 * sourceDiversityScore;

      return {
        keyword: t.keyword,
        category: t.category,
        articleCount: t.article_count,
        sourceDiversity: t.source_diversity,
        lastArticleAt: t.last_article_at,
        trendScore: Math.round(trendScore * 100),
      };
    });

    return NextResponse.json({
      success: true,
      count: trends.length,
      trends,
    });

  } catch (err: any) {
    console.error("INSIGHTS ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
