// app/api/insights/UtomDnsOsszkep/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";

// ---- Kategória típusok ----
const categoryKeys = [
  "Politika",
  "Gazdaság",
  "Közélet",
  "Kultúra",
  "Sport",
  "Tech",
  "Egészségügy",
  "Oktatás",
] as const;

type CategoryKey = (typeof categoryKeys)[number];

export async function GET(req: Request) {
  try {
    const sec = securityCheck(req);
    if (sec) return sec;

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "missing_domain" },
        { status: 400 }
      );
    }

    // ---- 1) Kategóriaeloszlás ----
    const [catRows]: any = await db.query(
      `
      SELECT category, COUNT(*) AS count
      FROM summaries
      WHERE source = ?
      GROUP BY category
      `,
      [domain]
    );

    const categories: Record<CategoryKey, number> = {
      Politika: 0,
      Gazdaság: 0,
      Közélet: 0,
      Kultúra: 0,
      Sport: 0,
      Tech: 0,
      Egészségügy: 0,
      Oktatás: 0,
    };

    for (const r of catRows) {
      if (categoryKeys.includes(r.category)) {
        categories[r.category as CategoryKey] = Number(r.count);
      }
    }

    const totalArticles = Object.values(categories).reduce(
      (a, b) => a + b,
      0
    );

    // ---- 2) Napi / heti / havi cikkek ----
    const [[daily]]: any = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM summaries
      WHERE source = ?
      AND DATE(created_at) = CURDATE()
      `,
      [domain]
    );

    const [[weekly]]: any = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM summaries
      WHERE source = ?
      AND YEARWEEK(created_at) = YEARWEEK(NOW())
      `,
      [domain]
    );

    const [[monthly]]: any = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM summaries
      WHERE source = ?
      AND MONTH(created_at) = MONTH(NOW())
      `,
      [domain]
    );

    // ---- 3) Átlagos cikkhossz (szószám) ----
    const [contentRows]: any = await db.query(
      `
      SELECT content_text
      FROM articles
      WHERE source = ?
      AND content_text IS NOT NULL
      `,
      [domain]
    );

    let totalWords = 0;
    let articleCount = 0;

    for (const r of contentRows) {
      const wc = r.content_text?.split(/\s+/).length || 0;
      if (wc > 0) {
        totalWords += wc;
        articleCount++;
      }
    }

    const avgWordCount =
      articleCount > 0 ? Math.round(totalWords / articleCount) : 0;

    const avgReadingTime =
      avgWordCount > 0 ? Math.ceil(avgWordCount / 200) : 0;

    // ---- 4) Dominancia index ----
    const maxCat = Math.max(...Object.values(categories));
    const dominanceIndex =
      totalArticles > 0 ? maxCat / totalArticles : 0;

    // ---- 5) Diverzitás index ----
    const nonZeroCats = Object.values(categories).filter((v) => v > 0).length;
    const diversityIndex = nonZeroCats / categoryKeys.length;

    // ---- 6) Átlagtól való eltérés (globális átlag) ----
    const [globalRows]: any = await db.query(`
      SELECT category, COUNT(*) AS count
      FROM summaries
      GROUP BY category
    `);

    const globalTotal = globalRows.reduce(
      (a: number, r: any) => a + Number(r.count),
      0
    );

    const globalAvg: Record<string, number> = {};
    for (const r of globalRows) {
      globalAvg[r.category] = Number(r.count) / globalTotal;
    }

    const avgVsGlobalAvg = categoryKeys.map((cat) => {
      const localRatio = totalArticles
        ? categories[cat] / totalArticles
        : 0;
      const globalRatio = globalAvg[cat] || 0;
      const diff = localRatio - globalRatio;
      return { category: cat, diff };
    });

    // ---- 7) Leggyakoribb téma ----
    const topTopic = Object.entries(categories).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    return NextResponse.json({
      success: true,
      domain,
      totalArticles,
      dailyArticles: daily?.c || 0,
      weeklyArticles: weekly?.c || 0,
      monthlyArticles: monthly?.c || 0,
      avgWordCount,
      avgReadingTime,
      categories,
      dominanceIndex,
      diversityIndex,
      avgVsGlobalAvg,
      topTopic,
    });

  } catch (err) {
    console.error("UtomDnsOsszkep API error:", err);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
