import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { checkPublicApiRateLimit } from "@/lib/security";

const MAX_FILTER_VALUES = 20;
const MAX_FILTER_VALUE_LENGTH = 64;
const MAX_TRENDS_RESULTS = 500;
const MAX_CUSTOM_DAYS = 366;

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseFilterList(raw: string | null): string[] | null {
  if (!raw) return [];
  const items = Array.from(new Set(raw.split(",").map((value) => value.trim()).filter(Boolean)));
  if (items.length > MAX_FILTER_VALUES || items.some((value) => value.length > MAX_FILTER_VALUE_LENGTH)) return null;
  return items;
}

function customRangeAllowed(startDate: string, endDate: string): boolean {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start && (end - start) <= MAX_CUSTOM_DAYS * 24 * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  let connection: mysql.Connection | null = null;
  try {
    if (!(await checkPublicApiRateLimit(req, "trends", 90, 60_000))) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

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

    const sourceList = parseFilterList(sources);
    const categoryList = parseFilterList(categories);
    if (!sourceList || !categoryList) {
      return NextResponse.json({ error: "Túl sok vagy túl hosszú szűrőérték." }, { status: 400 });
    }

    if (period === "custom") {
      if (!startDate || !endDate || !isCalendarDate(startDate) || !isCalendarDate(endDate) || !customRangeAllowed(startDate, endDate)) {
        return NextResponse.json({ error: "Érvénytelen vagy túl hosszú dátumtartomány." }, { status: 400 });
      }
    }

    let intervalValue: number | null = null;
    const intervalUnit = "DAY";
    if (period === "24h") intervalValue = 1;
    else if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;
    else if (period === "365d") intervalValue = 365;

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    if (period === "24h") {
      const realtimeWhere: string[] = ["k.created_at >= UTC_TIMESTAMP() - INTERVAL 1 DAY"];
      const realtimeParams: string[] = [];
      if (sourceList.length > 0) {
        realtimeWhere.push(`LOWER(TRIM(COALESCE(a.source, ''))) IN (${sourceList.map(() => "?").join(",")})`);
        realtimeParams.push(...sourceList.map((source) => source.toLowerCase()));
      }
      if (categoryList.length > 0) {
        realtimeWhere.push(`LOWER(TRIM(COALESCE(k.category, ''))) IN (${categoryList.map(() => "?").join(",")})`);
        realtimeParams.push(...categoryList.map((category) => category.toLowerCase()));
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
         ORDER BY freq DESC
         LIMIT ${MAX_TRENDS_RESULTS}`,
        realtimeParams,
      );
      return NextResponse.json({ status: "ok", trends: rows });
    }

    const whereParts: string[] = [];
    const params: string[] = [];
    if (period === "custom" && startDate && endDate) {
      whereParts.push("DATE(t.created_at) BETWEEN ? AND ?");
      params.push(startDate, endDate);
    } else if (intervalValue) {
      whereParts.push(`t.created_at >= UTC_TIMESTAMP() - INTERVAL ${intervalValue} ${intervalUnit}`);
    }

    if (sourceList.length > 0) {
      whereParts.push(`LOWER(TRIM(COALESCE(t.source, ''))) IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList.map((source) => source.toLowerCase()));
    }
    if (categoryList.length > 0) {
      whereParts.push(`LOWER(TRIM(COALESCE(t.category, ''))) IN (${categoryList.map(() => "?").join(",")})`);
      params.push(...categoryList.map((category) => category.toLowerCase()));
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

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
        growthParams.push(...sourceList.map((source) => source.toLowerCase()));
      }
      if (categoryList.length > 0) {
        historicalFilters.push(`LOWER(TRIM(COALESCE(t2.category, ''))) IN (${categoryList.map(() => "?").join(",")})`);
        growthParams.push(...categoryList.map((category) => category.toLowerCase()));
      }
      const historicalWhere = historicalFilters.join(" AND ");
      growthSql = `(
        (COUNT(*) - (
          SELECT COUNT(*)
          FROM trends t2
          WHERE ${historicalWhere}
            AND t2.created_at BETWEEN UTC_TIMESTAMP() - INTERVAL ${prevInterval} ${intervalUnit}
                                AND UTC_TIMESTAMP() - INTERVAL ${intervalValue} ${intervalUnit}
        )) / GREATEST(1, (
          SELECT COUNT(*)
          FROM trends t2
          WHERE ${historicalWhere}
            AND t2.created_at BETWEEN UTC_TIMESTAMP() - INTERVAL ${prevInterval} ${intervalUnit}
                                AND UTC_TIMESTAMP() - INTERVAL ${intervalValue} ${intervalUnit}
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
       ORDER BY freq DESC
       LIMIT ${MAX_TRENDS_RESULTS}`,
      [...growthParams, ...growthParams, ...params],
    );

    return NextResponse.json({ status: "ok", trends: rows });
  } catch (err: any) {
    console.error("API /trends hiba:", err?.message ?? err);
    return NextResponse.json({ error: "trends_query_failed" }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (closeError) {
        console.error("API /trends DB close error:", closeError);
      }
    }
  }
}
