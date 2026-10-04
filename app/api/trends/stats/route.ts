import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim();
    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "keyword paraméter hiányzik" }, { status: 400 });
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });
    try {
    const [minRows] = await connection.execute<any[]>(
  `SELECT MIN(cnt) AS minValue
   FROM (
     SELECT DATE(created_at) AS d, COUNT(*) AS cnt
     FROM trends
     WHERE keyword = ?
     GROUP BY DATE(created_at)
   ) t`,
  [keyword]
);

const [dailyRows] = await connection.execute<any[]>(
  `SELECT COUNT(*) AS cnt
   FROM trends
   WHERE keyword = ?
   GROUP BY DATE(created_at)
   ORDER BY cnt`,
  [keyword]
);

let medianValue = 0;
if (dailyRows.length > 0) {
  const counts = dailyRows.map(r => Number(r.cnt));
  counts.sort((a, b) => a - b);
  const mid = Math.floor(counts.length / 2);
  if (counts.length % 2 === 0) {
    medianValue = (counts[mid - 1] + counts[mid]) / 2;
  } else {
    medianValue = counts[mid];
  }
}

const [lengthRows] = await connection.execute<any[]>(
  `SELECT COUNT(*) AS spikeLength
   FROM (
     SELECT DATE(created_at) AS d, COUNT(*) AS cnt
     FROM trends
     WHERE keyword = ?
     GROUP BY DATE(created_at)
     HAVING COUNT(*) >= (
       SELECT AVG(cnt) * 2
       FROM (
         SELECT DATE(created_at) AS d, COUNT(*) AS cnt
         FROM trends
         WHERE keyword = ?
         GROUP BY DATE(created_at)
       ) sub
     )
   ) t`,
  [keyword, keyword]
);
    // Összes előfordulás
    const [totalRows] = await connection.execute<any[]>(
      `SELECT COUNT(*) AS totalCount FROM trends WHERE keyword = ?`,
      [keyword]
    );

    // Napi átlag
    const [avgRows] = await connection.execute<any[]>(
      `SELECT COUNT(*) / GREATEST(1, DATEDIFF(DATE(MAX(created_at)), DATE(MIN(created_at))) + 1) AS dailyAvg
       FROM trends WHERE keyword = ?`,
      [keyword]
    );
    const [rangeRows] = await connection.execute<any[]>(
  `SELECT MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
   FROM trends WHERE keyword = ?`,
  [keyword]
);
    // Csúcsnap
    const [peakRows] = await connection.execute<any[]>(
      `SELECT DATE(created_at) AS peakDate, COUNT(*) AS peakValue
       FROM trends WHERE keyword = ?
       GROUP BY DATE(created_at)
       ORDER BY peakValue DESC, peakDate DESC
       LIMIT 1`,
      [keyword]
    );

    // Visszatérő jelzés (ha több mint 1 különálló hónapban van előfordulás)
    const [recurringRows] = await connection.execute<any[]>(
      `SELECT COUNT(DISTINCT DATE_FORMAT(created_at, '%Y-%m')) AS months
       FROM trends WHERE keyword = ?`,
      [keyword]
    );

    return NextResponse.json({
      status: "ok",
      stats: {
    totalCount: Number(totalRows[0]?.totalCount ?? 0),
    dailyAvg: Number(avgRows[0]?.dailyAvg ?? 0),
    peakDate: peakRows[0]?.peakDate ?? null,
    peakValue: Number(peakRows[0]?.peakValue ?? 0),
    isRecurring: (recurringRows[0]?.months ?? 0) > 1,
    first_seen: rangeRows[0]?.first_seen ?? null,
    last_seen: rangeRows[0]?.last_seen ?? null,
    minValue: Number(minRows[0]?.minValue ?? 0),
    medianValue: medianValue,
    spikeLength: Number(lengthRows[0]?.spikeLength ?? 0),
      },
    });
    } finally {
      await connection.end();
    }
  } catch (err: any) {
    console.error("API /trends/stats hiba:", err.message);
    // Do not expose SQL/driver details as an API contract. Keep the
    // diagnostic in server logs and return the same stable error shape as
    // the other trends endpoints.
    return NextResponse.json({ error: "trends_stats_failed" }, { status: 500 });
  }
}
