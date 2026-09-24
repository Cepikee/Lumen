// app/api/trend-history/route.ts
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const period = searchParams.get("period");
  const sources = searchParams.get("sources");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!keyword) {
    return NextResponse.json({ error: "keyword paraméter hiányzik" }, { status: 400 });
  }

  try {
    const sourceList = sources ? sources.split(",").filter(s => s.trim() !== "") : [];

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev"
    });

    /* ---------------------------------------------------------
       🔥 24 ÓRÁS NÉZET — ÓRÁNKÉNTI AGGREGÁCIÓ
    --------------------------------------------------------- */
    if (period === "24h") {
      const whereParts: string[] = ["keyword = ?"];
      const params: any[] = [keyword];

      // csak a mai nap
      whereParts.push(`DATE(created_at) = CURDATE()`);

      if (sourceList.length > 0) {
        whereParts.push(`source IN (${sourceList.map(() => "?").join(",")})`);
        params.push(...sourceList);
      }

      const whereClause = `WHERE ${whereParts.join(" AND ")}`;

      const [rows] = await connection.execute<any[]>(
        `
        SELECT 
          HOUR(created_at) AS hour,
          COUNT(*) AS freq
        FROM trends
        ${whereClause}
        GROUP BY hour
        ORDER BY hour ASC
        `,
        params
      );

      await connection.end();

      // 🔥 töltsük fel a hiányzó órákat 0-val
      const hourly = Array.from({ length: 24 }, (_, i) => {
        const found = rows.find(r => r.hour === i);
        return {
          hour: i,
          freq: found?.freq ?? 0
        };
      });

      return NextResponse.json({
        keyword,
        history: hourly
      });
    }

    /* ---------------------------------------------------------
       🔥 NAPI AGGREGÁCIÓ (3d, 7d, 30d, custom, all)
    --------------------------------------------------------- */

    let intervalValue: number | null = null;
    const intervalUnit = "DAY";

    if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;
    else if (period === "custom") intervalValue = null;

    const whereParts: string[] = ["keyword = ?"];
    const params: any[] = [keyword];

    if (period !== "custom" && intervalValue) {
      whereParts.push(`created_at >= NOW() - INTERVAL ${intervalValue} ${intervalUnit}`);
    }

    if (period === "custom" && startDate && endDate) {
      whereParts.push(`DATE(created_at) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    if (sourceList.length > 0) {
      whereParts.push(`source IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList);
    }

    const whereClause = `WHERE ${whereParts.join(" AND ")}`;

    const [rows] = await connection.execute<any[]>(
      `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
        COUNT(*) AS freq
      FROM trends
      ${whereClause}
      GROUP BY day
      ORDER BY day ASC
      `,
      params
    );

    await connection.end();

    return NextResponse.json({
      keyword,
      history: rows
    });

  } catch (err: any) {
    console.error("API /trend-history hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
