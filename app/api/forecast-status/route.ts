import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

function calculateNextRun(finishedAt: Date) {
  const nextHour = new Date(finishedAt);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const forecastEnd = new Date(nextHour);
  forecastEnd.setHours(forecastEnd.getHours() + 6);

  const nextRun = new Date(forecastEnd);
  nextRun.setMinutes(nextRun.getMinutes() - 15);

  return nextRun;
}

export async function GET() {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    const [rows] = await conn.execute(
      "SELECT finished_at FROM forecast_runs ORDER BY id DESC LIMIT 1"
    );

    await conn.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        status: "unknown",
        lastRun: null,
        nextRun: null,
      });
    }

    const lastRun = new Date((rows as any)[0].finished_at);
    const nextRun = calculateNextRun(lastRun);

    const now = new Date();

    let status: "running" | "waiting" = "waiting";
    if (now > nextRun) status = "running";

    return NextResponse.json({
      status,
      lastRun,
      nextRun,
    });
  } catch (err) {
    console.error("Forecast status API error:", err);
    return NextResponse.json(
      {
        status: "error",
        lastRun: null,
        nextRun: null,
      },
      { status: 500 }
    );
  }
}
