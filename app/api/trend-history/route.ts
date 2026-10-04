// app/api/trend-history/route.ts
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { mysqlUtc } from "@/lib/business-time";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim();
  const period = searchParams.get("period");
  const sources = searchParams.get("sources");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!keyword || !keyword.trim()) {
    return NextResponse.json({ error: "keyword paraméter hiányzik" }, { status: 400 });
  }
  const allowedPeriods = new Set(["24h", "7d", "30d", "custom"]);
  if (!period || !allowedPeriods.has(period)) {
    return NextResponse.json({ error: "Érvénytelen időszak." }, { status: 400 });
  }
  const isRealIsoDate = (value: string | null): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;
  };
  if (period === "custom" && (!isRealIsoDate(startDate) || !isRealIsoDate(endDate) || startDate > endDate)) {
    return NextResponse.json({ error: "Érvénytelen dátumtartomány." }, { status: 400 });
  }

  let connection: mysql.Connection | null = null;
  try {
    const sourceList = sources
      ? Array.from(new Set(sources.split(",").map((s) => s.trim()).filter(Boolean)))
      : [];

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
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

      // gördülő, abszolút UTC 24 órás ablak
      whereParts.push(`created_at >= ? AND created_at < ?`);
      const now = new Date();
      params.push(mysqlUtc(new Date(now.getTime() - 24 * 60 * 60 * 1000)), mysqlUtc(now));

      if (sourceList.length > 0) {
        whereParts.push(`LOWER(TRIM(source)) IN (${sourceList.map(() => "?").join(",")})`);
        params.push(...sourceList.map((source) => source.toLowerCase()));
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

      // 🔥 töltsük fel a hiányzó órákat 0-val
      const hourly = Array.from({ length: 24 }, (_, i) => {
        // mysql2 may return numeric aggregates as strings. Comparing the
        // driver value directly to the numeric hour silently turned every
        // bucket into zero on the 24h view.
        const found = rows.find(r => Number(r.hour) === i);
        return {
          hour: i,
          freq: Number.isFinite(Number(found?.freq)) ? Number(found?.freq) : 0
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
      whereParts.push(`created_at >= UTC_TIMESTAMP() - INTERVAL ${intervalValue} ${intervalUnit}`);
      whereParts.push("created_at < UTC_TIMESTAMP()");
    }

    if (period === "custom" && startDate && endDate) {
      whereParts.push(`DATE(created_at) BETWEEN ? AND ?`);
      whereParts.push("created_at < UTC_TIMESTAMP()");
      params.push(startDate, endDate);
    }

    if (sourceList.length > 0) {
      whereParts.push(`LOWER(TRIM(source)) IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList.map((source) => source.toLowerCase()));
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

    return NextResponse.json({
      keyword,
      history: rows
    });

  } catch (err: any) {
    console.error("API /trend-history hiba:", err?.message ?? err);
    // Do not expose driver/server details (SQL, host names, or credentials)
    // through a public error response.  The client only needs a stable error
    // contract; the detailed failure remains in server logs.
    return NextResponse.json({ error: "trend_history_failed" }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (closeError) {
        console.error("API /trend-history DB close error:", closeError);
      }
    }
  }
}
