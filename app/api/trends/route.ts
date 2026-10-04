import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export async function GET(req: Request) {
  let connection: mysql.Connection | null = null;
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    const sources = searchParams.get("sources");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categories = searchParams.get("categories");

    const allowedPeriods = new Set(["24h", "7d", "30d", "365d", "custom"]);
    if (!period || !allowedPeriods.has(period)) {
      return NextResponse.json({ error: "Érvénytelen időszak." }, { status: 400 });
    }

    let intervalValue: number | null = null;
    let intervalUnit = "DAY";

    if (period === "24h") intervalValue = 1;
    else if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;
    else if (period === "365d") intervalValue = 365;

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev"
    });

    const sourceList = sources ? sources.split(",").map(s => s.trim()).filter(s => s !== "") : [];
    const categoryList = categories ? categories.split(",").map(c => c.trim()).filter(c => c !== "") : [];

    let whereParts: string[] = [];
    const params: any[] = [];

    // ---- 24 órás nézet: valós idejű aggregáció, NEM a trends cache ----
if (period === "24h") {
  const realtimeWhere: string[] = ["k.created_at >= UTC_TIMESTAMP() - INTERVAL 1 DAY"];
  const realtimeParams: string[] = [];
  if (sourceList.length > 0) {
    realtimeWhere.push(`LOWER(TRIM(COALESCE(a.source, ''))) IN (${sourceList.map(() => "?").join(",")})`);
    realtimeParams.push(...sourceList.map(s => s.toLowerCase()));
  }
  if (categoryList.length > 0) {
    realtimeWhere.push(`LOWER(TRIM(COALESCE(k.category, ''))) IN (${categoryList.map(() => "?").join(",")})`);
    realtimeParams.push(...categoryList.map(c => c.toLowerCase()));
  }
  const [rows] = await connection.execute<any[]>(
    `SELECT 
        k.keyword,
        k.category,
        COUNT(*) AS freq,
        MIN(k.created_at) AS first_seen,
        MAX(k.created_at) AS last_seen,
        NULL AS growth
     FROM keywords k
     JOIN articles a ON a.id = k.article_id
     WHERE ${realtimeWhere.join(" AND ")}
     GROUP BY k.keyword, k.category
     ORDER BY freq DESC`
    , realtimeParams
  );

  await connection.end();
  return NextResponse.json({ status: "ok", trends: rows });
}

// ---- minden más időszak: trends cache ----
  if (period === "custom" && startDate && endDate) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate) {
    await connection?.end();
    return NextResponse.json({ error: "Érvénytelen dátumtartomány." }, { status: 400 });
  }
  whereParts.push(`DATE(t.created_at) BETWEEN ? AND ?`);
  params.push(startDate, endDate);
} else if (period === "custom") {
  await connection?.end();
  return NextResponse.json({ error: "A custom időszakhoz kezdő és záró dátum szükséges." }, { status: 400 });
} else if (intervalValue) {
  whereParts.push(`t.created_at >= NOW() - INTERVAL ${intervalValue} ${intervalUnit}`);
}


    // források (case-insensitive)
    if (sourceList.length > 0) {
      whereParts.push(`LOWER(TRIM(COALESCE(t.source, ''))) IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList.map(s => s.toLowerCase()));
    }

    // kategóriák (case-insensitive, ékezetekre a backend normalizálása a legegyszerűbb)
    if (categoryList.length > 0) {
      whereParts.push(`LOWER(TRIM(COALESCE(t.category, ''))) IN (${categoryList.map(() => "?").join(",")})`);
      params.push(...categoryList.map(c => c.toLowerCase()));
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    // DEBUG: logoljuk a beérkező searchParams-okat, a WHERE-t és a params tömböt
    console.log("DEBUG /api/trends SEARCHPARAMS:", {
      period,
      sources,
      startDate,
      endDate,
      categories
    });
    console.log("DEBUG /api/trends WHERE:", whereClause);
    console.log("DEBUG /api/trends PARAMS:", params);

    // growth csak akkor számolódjon, ha intervalValue definiált és > 0
    let growthSql = "NULL AS growth";
    const growthParams: string[] = [];
    if (intervalValue && intervalValue > 0) {
      const prevInterval = 2 * intervalValue;
      const historicalFilters = [
        "t2.keyword = t.keyword",
        "t2.category <=> t.category",
      ];
      if (sourceList.length > 0) {
        historicalFilters.push(`LOWER(TRIM(COALESCE(t2.source, ''))) IN (${sourceList.map(() => "?").join(",")})`);
        growthParams.push(...sourceList.map((s) => s.toLowerCase()));
      }
      if (categoryList.length > 0) {
        historicalFilters.push(`LOWER(TRIM(COALESCE(t2.category, ''))) IN (${categoryList.map(() => "?").join(",")})`);
        growthParams.push(...categoryList.map((c) => c.toLowerCase()));
      }
      const historicalWhere = historicalFilters.join(" AND ");
      growthSql = `(
        (COUNT(*) - (
          SELECT COUNT(*) 
          FROM trends t2 
          WHERE ${historicalWhere}
            AND t2.created_at BETWEEN NOW() - INTERVAL ${prevInterval} ${intervalUnit} 
                                AND NOW() - INTERVAL ${intervalValue} ${intervalUnit}
        )) / GREATEST(1, (
          SELECT COUNT(*) 
          FROM trends t2 
          WHERE ${historicalWhere}
            AND t2.created_at BETWEEN NOW() - INTERVAL ${prevInterval} ${intervalUnit} 
                                AND NOW() - INTERVAL ${intervalValue} ${intervalUnit}
        ))
      ) AS growth`;
    }

    const [rows] = await connection.execute<any[]>(
      `SELECT 
          t.keyword,
          t.category,
          COUNT(*) AS freq,
          MIN(t.created_at) AS first_seen,
          MAX(t.created_at) AS last_seen,
          ${growthSql}
       FROM trends t
       ${whereClause}
       GROUP BY t.keyword, t.category
       ORDER BY freq DESC`,
      [...growthParams, ...growthParams, ...params]
    );

    // DEBUG: hány sort adott vissza a lekérdezés
    console.log("DEBUG /api/trends ROWS_COUNT:", Array.isArray(rows) ? rows.length : 0);

    await connection.end();

    return NextResponse.json({ status: "ok", trends: rows });
  } catch (err: any) {
    console.error("API /trends hiba:", err?.message ?? err);
    if (connection) {
      try { await connection.end(); } catch (closeError) {
        console.error("API /trends DB close error:", closeError);
      }
    }
    // Keep database/driver details out of the public API contract.  Returning
    // err.message here leaked SQL diagnostics and made clients depend on
    // unstable infrastructure text.
    return NextResponse.json({ error: "trends_query_failed" }, { status: 500 });
  }
}
