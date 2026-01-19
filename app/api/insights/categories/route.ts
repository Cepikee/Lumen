// app/api/insights/categories/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        a.category,
        COUNT(*) AS article_count,
        COUNT(DISTINCT a.source) AS source_diversity,
        MAX(a.created_at) AS last_article_at
      FROM articles a
      WHERE a.created_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY a.category
      HAVING article_count >= 3
      ORDER BY article_count DESC, last_article_at DESC
      `
    );

    const categories = (rows as any[]).map((r) => {
      const recentActivityScore = Math.min(r.article_count / 20, 1);
      const sourceDiversityScore = Math.min(r.source_diversity / 5, 1);

      const trendScore =
        0.5 * recentActivityScore +
        0.5 * sourceDiversityScore;

      return {
        category: r.category,
        articleCount: r.article_count,
        sourceDiversity: r.source_diversity,
        lastArticleAt: r.last_article_at,
        trendScore: Math.round(trendScore * 100),
      };
    });

    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    console.error("CATEGORY INSIGHTS ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
