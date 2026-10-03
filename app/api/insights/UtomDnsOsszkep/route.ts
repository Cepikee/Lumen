// app/api/insights/UtomDnsOsszkep/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { businessDayBounds, businessMonthBounds, businessWeekBounds, mysqlUtc } from "@/lib/business-time";

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

function canonicalCategory(value: unknown): CategoryKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLocaleLowerCase("hu-HU");
  const match = categoryKeys.find((category) =>
    category.toLocaleLowerCase("hu-HU") === normalized
  );
  return match ?? null;
}

export async function GET(req: Request) {
  try {
    const sec = await securityCheck(req);
    if (sec) return sec;

    const { searchParams } = new URL(req.url);
    let domain = searchParams.get("domain")?.trim().toLowerCase();

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "missing_domain" },
        { status: 400 }
      );
    }

    // The source distribution endpoint exposes the historical Portfolio
    // alias as `portfolio.hu`; use the same alias when loading its details.
    if (domain === "portfolio.hu") domain = "portfolio";

    // ---- 1) Kategóriaeloszlás ----
    const [catRows]: any = await db.query(
      `
      SELECT LOWER(TRIM(category)) AS category, COUNT(*) AS count
      FROM summaries
      WHERE LOWER(TRIM(source)) = ?
      GROUP BY LOWER(TRIM(category))
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
      const category = canonicalCategory(r.category);
      if (category) {
        categories[category] += Number(r.count) || 0;
      }
    }

    const totalArticles = Object.values(categories).reduce(
      (a, b) => a + b,
      0
    );

    // ---- 2) Napi / heti / havi cikkek ----
    const dayBounds = businessDayBounds(new Date());
    const weekBounds = businessWeekBounds(new Date());
    const monthBounds = businessMonthBounds(new Date());
    const [[daily]]: any = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM summaries
      WHERE LOWER(TRIM(source)) = ?
      AND created_at >= ? AND created_at < ?
      `,
      [domain, mysqlUtc(dayBounds.start), mysqlUtc(dayBounds.end)]
    );

    const [[weekly]]: any = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM summaries
      WHERE LOWER(TRIM(source)) = ?
      AND created_at >= ? AND created_at < ?
      `,
      [domain, mysqlUtc(weekBounds.start), mysqlUtc(weekBounds.end)]
    );

    const [[monthly]]: any = await db.query(
      `
      SELECT COUNT(*) AS c
      FROM summaries
      WHERE LOWER(TRIM(source)) = ?
      AND created_at >= ? AND created_at < ?
      `,
      [domain, mysqlUtc(monthBounds.start), mysqlUtc(monthBounds.end)]
    );

    // ---- 3) Átlagos cikkhossz (szószám) ----
    const [contentRows]: any = await db.query(
      `
      SELECT content_text
      FROM articles
      WHERE LOWER(TRIM(source)) = ?
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
      SELECT LOWER(TRIM(category)) AS category, COUNT(*) AS count
      FROM summaries
      WHERE category IS NOT NULL AND TRIM(category) <> ''
      GROUP BY LOWER(TRIM(category))
    `);

    const globalTotal = globalRows.reduce(
      (a: number, r: any) => a + Number(r.count),
      0
    );

    const globalAvg: Record<string, number> = {};
    for (const r of globalRows) {
      const category = canonicalCategory(r.category);
      if (category && globalTotal > 0) {
        globalAvg[category] = (globalAvg[category] ?? 0) + Number(r.count || 0) / globalTotal;
      }
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
    const topEntry = Object.entries(categories).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "hu")
    )[0];
    const topTopic = topEntry && topEntry[1] > 0 ? topEntry[0] : null;

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
