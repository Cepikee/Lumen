export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const period = searchParams.get("period") || "7d";

  if (!keyword) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
  }

  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
      charset: "utf8mb4",
    });

    let days: number | null = null;
    if (period === "all") {
      days = null;
    } else if (period.endsWith("d")) {
      const parsed = parseInt(period.slice(0, -1), 10);
      days = Number.isNaN(parsed) ? 7 : parsed;
    } else {
      days = 7;
    }

    const keywordLike = `%${keyword.trim()}%`;

    let dateFilter = "";
    let params: any[] = [keywordLike];

    if (period !== "all") {
      dateFilter =
        "AND CAST(a.published_at AS DATETIME) >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(days);
    }

    const [rows] = await connection.execute(
      `SELECT 
         a.title,
         a.url_canonical AS url,
         s.name AS source,
         a.published_at AS date,
         SUMM.content AS summary,
         SUMM.trend_keywords
       FROM articles a
       LEFT JOIN sources s ON a.source_id = s.id
       LEFT JOIN summaries SUMM ON a.id = SUMM.article_id
       WHERE COALESCE(SUMM.trend_keywords, '') LIKE ?
       ${dateFilter}
       ORDER BY a.published_at DESC
       LIMIT 20`,
      params
    );

    await connection.end();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("SQL error:", error);
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  }
}
