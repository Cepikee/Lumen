export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const period = searchParams.get("period") || "7d";

  if (!keyword || !keyword.trim()) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
  }
  if (period !== "all" && !/^\d+d$/.test(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
      charset: "utf8mb4",
    });

    let days: number | null = null;
    if (period === "all") {
      days = null;
    } else if (period.endsWith("d")) {
      const parsed = Number(period.slice(0, -1));
      if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 3650) {
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
      }
      days = parsed;
    } else {
      days = 7;
    }

    let dateFilter = "";
    let params: any[] = [keyword.trim()];

    if (period !== "all") {
      dateFilter =
        "AND CAST(a.published_at AS DATETIME) >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(days);
    }

    const [rows] = await connection.execute(
      `SELECT DISTINCT
         a.title,
         a.url_canonical AS url,
         s.name AS source,
         a.published_at AS date,
         SUMM.content AS summary,
         SUMM.trend_keywords
       FROM keywords k
       JOIN articles a ON a.id = k.article_id
       LEFT JOIN sources s ON a.source_id = s.id
       LEFT JOIN summaries SUMM
         ON a.id = SUMM.article_id
        AND NOT EXISTS (
          SELECT 1
          FROM summaries newer_summ
          WHERE newer_summ.article_id = SUMM.article_id
            AND (
              newer_summ.created_at > SUMM.created_at
              OR (newer_summ.created_at = SUMM.created_at AND newer_summ.id > SUMM.id)
            )
        )
       WHERE k.keyword = ?
       ${dateFilter}
       ORDER BY a.published_at DESC, a.id DESC
       LIMIT 20`,
      params
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("SQL error:", error);
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (closeError) {
        console.error("SQL connection close error:", closeError);
      }
    }
  }
}
