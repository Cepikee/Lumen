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

    // period kezelés
    let days: number | null = null;
    if (period === "all") {
      days = null;
    } else if (period.endsWith("d")) {
      const parsed = parseInt(period.slice(0, -1), 10);
      days = Number.isNaN(parsed) ? 7 : parsed;
    } else {
      days = 7;
    }

    // ékezet- és case-insensitive összehasonlítás
    let whereClause = "";
    if (period === "all") {
      whereClause = "WHERE k.keyword COLLATE utf8mb4_unicode_ci = ?";
    } else {
      whereClause =
        "WHERE k.keyword COLLATE utf8mb4_unicode_ci = ? AND a.published_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
    }

    const params = period === "all" ? [keyword.trim()] : [keyword.trim(), days];

    console.log("DEBUG params:", { keyword, period, days, params });

    const [rows] = await connection.execute(
      `SELECT 
         a.title,
         a.url_canonical AS url,
         s.name AS source,
         a.published_at AS date,
         SUMM.content AS summary
       FROM articles a
       JOIN keywords k ON a.id = k.article_id
       JOIN sources s ON a.source_id = s.id
       LEFT JOIN summaries SUMM ON a.id = SUMM.article_id
       ${whereClause}
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
