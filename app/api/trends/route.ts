import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    const sources = searchParams.get("sources");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categories = searchParams.get("categories");

    let intervalValue: number | null = null;
    let intervalUnit = "DAY";

    if (period === "24h") intervalValue = 1;
    else if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;
    else if (period === "365d") intervalValue = 365;

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    const sourceList = sources ? sources.split(",").map(s => s.trim()).filter(s => s !== "") : [];
    const categoryList = categories ? categories.split(",").map(c => c.trim()).filter(c => c !== "") : [];

    let whereParts: string[] = [];
    const params: any[] = [];

    // ---- 24 órás nézet: valós idejű aggregáció, NEM a trends cache ----
if (period === "24h") {
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
     WHERE k.created_at >= NOW() - INTERVAL 1 DAY
     GROUP BY k.keyword, k.category
     ORDER BY freq DESC`
  );

  await connection.end();
  return NextResponse.json({ status: "ok", trends: rows });
}

// ---- minden más időszak: trends cache ----
if (period === "custom" && startDate && endDate) {
  whereParts.push(`DATE(t.created_at) BETWEEN ? AND ?`);
  params.push(startDate, endDate);
} else if (intervalValue) {
  whereParts.push(`t.created_at >= NOW() - INTERVAL ${intervalValue} ${intervalUnit}`);
}


    // források (case-insensitive)
    if (sourceList.length > 0) {
      whereParts.push(`LOWER(COALESCE(t.source, '')) IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList.map(s => s.toLowerCase()));
    }

    // kategóriák (case-insensitive, ékezetekre a backend normalizálása a legegyszerűbb)
    if (categoryList.length > 0) {
      whereParts.push(`LOWER(COALESCE(t.category, '')) IN (${categoryList.map(() => "?").join(",")})`);
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
    if (intervalValue && intervalValue > 0) {
      const prevInterval = 2 * intervalValue;
      growthSql = `(
        (COUNT(*) - (
          SELECT COUNT(*) 
          FROM trends t2 
          WHERE t2.keyword = t.keyword 
            AND t2.created_at BETWEEN NOW() - INTERVAL ${prevInterval} ${intervalUnit} 
                                AND NOW() - INTERVAL ${intervalValue} ${intervalUnit}
        )) / GREATEST(1, (
          SELECT COUNT(*) 
          FROM trends t2 
          WHERE t2.keyword = t.keyword 
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
      params
    );

    // DEBUG: hány sort adott vissza a lekérdezés
    console.log("DEBUG /api/trends ROWS_COUNT:", Array.isArray(rows) ? rows.length : 0);

    await connection.end();

    return NextResponse.json({ status: "ok", trends: rows });
  } catch (err: any) {
    console.error("API /trends hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
