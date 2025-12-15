import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    const sources = searchParams.get("sources");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let intervalValue: number | null = null;
    let intervalUnit = "DAY";

    if (period === "24h") intervalValue = 1;
    else if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    const sourceList = sources ? sources.split(",").filter(s => s.trim() !== "") : [];

    let whereParts: string[] = [];
    const params: any[] = [];

    if (period === "custom" && startDate && endDate) {
      whereParts.push(`DATE(t.created_at) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    } else if (intervalValue) {
      whereParts.push(`t.created_at >= NOW() - INTERVAL ${intervalValue} ${intervalUnit}`);
    }

    if (sourceList.length > 0) {
      whereParts.push(`t.source IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [rows] = await connection.execute<any[]>(
      `SELECT 
          t.keyword,
          COUNT(*) AS freq,
          MIN(t.created_at) AS first_seen,
          MAX(t.created_at) AS last_seen,
          ${
            period === "custom"
              ? "NULL AS growth"
              : `(
                  (COUNT(*) - (
                    SELECT COUNT(*) 
                    FROM trends t2 
                    WHERE t2.keyword = t.keyword 
                      AND t2.created_at BETWEEN NOW() - INTERVAL ${2 * (intervalValue ?? 0)} ${intervalUnit} 
                                          AND NOW() - INTERVAL ${intervalValue ?? 0} ${intervalUnit}
                  )) / GREATEST(1, (
                    SELECT COUNT(*) 
                    FROM trends t2 
                    WHERE t2.keyword = t.keyword 
                      AND t2.created_at BETWEEN NOW() - INTERVAL ${2 * (intervalValue ?? 0)} ${intervalUnit} 
                                          AND NOW() - INTERVAL ${intervalValue ?? 0} ${intervalUnit}
                  ))
                ) AS growth`
          }
       FROM trends t
       ${whereClause}
       GROUP BY t.keyword
       ORDER BY freq DESC
       LIMIT 20`,
      params
    );

    await connection.end();

    return NextResponse.json({ status: "ok", trends: rows });
  } catch (err: any) {
    console.error("API /trends hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
