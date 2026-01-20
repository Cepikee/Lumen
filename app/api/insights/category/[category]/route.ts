import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, context: any) {
  try {
    const rawCategory = context?.params?.category;

    // 1) VÉDELEM: ha hiányzik vagy "undefined"
    if (!rawCategory || rawCategory === "undefined") {
      console.error("INVALID CATEGORY PARAM:", rawCategory);
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const decoded = decodeURIComponent(rawCategory);

    // 2) META
    const [metaRows] = await db.query(
      `
      SELECT 
        a.category,
        COUNT(*) AS total_articles,
        COUNT(DISTINCT a.source) AS source_diversity,
        MAX(a.created_at) AS last_article_at
      FROM articles a
      WHERE a.category = ?
      GROUP BY a.category
      `,
      [decoded]
    );

    if (!metaRows || (metaRows as any[]).length === 0) {
      return NextResponse.json({ success: false });
    }

    const meta = (metaRows as any[])[0];

    // 3) SPARKLINE (24h)
    const [sparkRows] = await db.query(
      `
      SELECT 
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:00:00') AS bucket,
        COUNT(*) AS article_count
      FROM articles a
      WHERE a.category = ?
        AND a.created_at >= NOW() - INTERVAL 24 HOUR
      GROUP BY bucket
      ORDER BY bucket
      `,
      [decoded]
    );

    const sparklineData = (sparkRows as any[]).map((row) => ({
      bucket: row.bucket,
      count: row.article_count,
    }));

    // 4) DOMINÁNS FORRÁSOK
    const [sourceRows] = await db.query(
      `
      SELECT 
        a.source,
        COUNT(*) AS article_count
      FROM articles a
      WHERE a.category = ?
        AND DATE(a.created_at) = CURDATE()
      GROUP BY a.source
      ORDER BY article_count DESC
      `,
      [decoded]
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

    // 5) KAPCSOLÓDÓ KULCSSZAVAK
    const [keywordRows] = await db.query(
      `
      SELECT 
        k.keyword,
        COUNT(*) AS article_count
      FROM keywords k
      JOIN articles a ON a.id = k.article_id
      WHERE a.category = ?
      GROUP BY k.keyword
      ORDER BY article_count DESC
      LIMIT 20
      `,
      [decoded]
    );

    // SZŰRÉS: csak érvényes kulcsszavak
    const filteredKeywords = (keywordRows as any[]).filter(
      (k) => k?.keyword && k.keyword !== "undefined"
    );

    // 6) KAPCSOLÓDÓ CIKKEK
    const [articleRows] = await db.query(
      `
      SELECT 
        a.id,
        a.title,
        a.url_canonical,
        a.source,
        a.created_at
      FROM articles a
      WHERE a.category = ?
      ORDER BY a.created_at DESC
      LIMIT 20
      `,
      [decoded]
    );

    // 7) TrendScore
    const recentActivityScore = Math.min(meta.total_articles / 20, 1);
    const sourceDiversityScore = Math.min(meta.source_diversity / 5, 1);

    const trendScore =
      0.5 * recentActivityScore +
      0.5 * sourceDiversityScore;

    return NextResponse.json({
      success: true,
      category: decoded,
      trendScore: Math.round(trendScore * 100),
      meta,
      sparklineData,
      sourceDominance,
      relatedKeywords: filteredKeywords,
      relatedArticles: articleRows,
    });

  } catch (err) {
    console.error("CATEGORY INSIGHT ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
