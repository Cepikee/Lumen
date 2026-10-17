import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { mysqlUtc } from "@/lib/business-time";
import { checkPublicApiRateLimit } from "@/lib/security";

const MAX_KEYWORD_LENGTH = 100;
const MAX_FILTER_VALUES = 20;
const MAX_FILTER_VALUE_LENGTH = 64;
const MAX_CUSTOM_DAYS = 366;

function isRealIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function rangeAllowed(startDate: string, endDate: string): boolean {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start && (end - start) <= MAX_CUSTOM_DAYS * 24 * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  if (!(await checkPublicApiRateLimit(req, "trend-history", 60, 60_000))) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim() || "";
  const period = searchParams.get("period");
  const sources = searchParams.get("sources");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) {
    return NextResponse.json({ error: "Érvénytelen keyword paraméter." }, { status: 400 });
  }
  const allowedPeriods = new Set(["24h", "7d", "30d", "custom"]);
  if (!period || !allowedPeriods.has(period)) {
    return NextResponse.json({ error: "Érvénytelen időszak." }, { status: 400 });
  }
  if (period === "custom" && (!isRealIsoDate(startDate) || !isRealIsoDate(endDate) || !rangeAllowed(startDate, endDate))) {
    return NextResponse.json({ error: "Érvénytelen vagy túl hosszú dátumtartomány." }, { status: 400 });
  }

  const sourceList = sources
    ? Array.from(new Set(sources.split(",").map((source) => source.trim()).filter(Boolean)))
    : [];
  if (sourceList.length > MAX_FILTER_VALUES || sourceList.some((source) => source.length > MAX_FILTER_VALUE_LENGTH)) {
    return NextResponse.json({ error: "Túl sok vagy túl hosszú forrásszűrő." }, { status: 400 });
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    if (period === "24h") {
      const whereParts: string[] = ["keyword = ?"];
      const params: any[] = [keyword];
      whereParts.push("created_at >= ? AND created_at < ?");
      const now = new Date();
      params.push(mysqlUtc(new Date(now.getTime() - 24 * 60 * 60 * 1000)), mysqlUtc(now));

      if (sourceList.length > 0) {
        whereParts.push(`LOWER(TRIM(source)) IN (${sourceList.map(() => "?").join(",")})`);
        params.push(...sourceList.map((source) => source.toLowerCase()));
      }

      const [rows] = await connection.execute<any[]>(
        `SELECT HOUR(created_at) AS hour, COUNT(*) AS freq
         FROM trends
         WHERE ${whereParts.join(" AND ")}
         GROUP BY hour
         ORDER BY hour ASC`,
        params,
      );

      const hourly = Array.from({ length: 24 }, (_, hour) => {
        const found = rows.find((row) => Number(row.hour) === hour);
        return { hour, freq: Number.isFinite(Number(found?.freq)) ? Number(found?.freq) : 0 };
      });
      return NextResponse.json({ keyword, history: hourly });
    }

    let intervalValue: number | null = null;
    if (period === "7d") intervalValue = 7;
    else if (period === "30d") intervalValue = 30;

    const whereParts: string[] = ["keyword = ?"];
    const params: any[] = [keyword];
    if (period !== "custom" && intervalValue) {
      whereParts.push(`created_at >= UTC_TIMESTAMP() - INTERVAL ${intervalValue} DAY`);
      whereParts.push("created_at < UTC_TIMESTAMP()");
    }
    if (period === "custom" && startDate && endDate) {
      whereParts.push("DATE(created_at) BETWEEN ? AND ?");
      whereParts.push("created_at < UTC_TIMESTAMP()");
      params.push(startDate, endDate);
    }
    if (sourceList.length > 0) {
      whereParts.push(`LOWER(TRIM(source)) IN (${sourceList.map(() => "?").join(",")})`);
      params.push(...sourceList.map((source) => source.toLowerCase()));
    }

    const [rows] = await connection.execute<any[]>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS freq
       FROM trends
       WHERE ${whereParts.join(" AND ")}
       GROUP BY day
       ORDER BY day ASC
       LIMIT ${MAX_CUSTOM_DAYS + 1}`,
      params,
    );

    return NextResponse.json({ keyword, history: rows });
  } catch (err: any) {
    console.error("API /trend-history hiba:", err?.message ?? err);
    return NextResponse.json({ error: "trend_history_failed" }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (closeError) {
        console.error("API /trend-history DB close error:", closeError);
      }
    }
  }
}
