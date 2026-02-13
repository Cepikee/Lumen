import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// HELYES következő futás számítás
function calculateNextRun(finishedAt: Date) {
  const nextRun = new Date(finishedAt);
  nextRun.setHours(nextRun.getHours() + 6);
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
      "SELECT status, finished_at FROM forecast_runs ORDER BY id DESC LIMIT 1"
    );

    await conn.end();

    // Nincs adat
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        status: "unknown",
        lastRun: null,
        nextRun: null,
      });
    }

    const row = (rows as any)[0];

    // Ha éppen fut → RUNNING
    if (row.status === "running") {
      return NextResponse.json({
        status: "running",
        lastRun: row.finished_at ? new Date(row.finished_at) : null,
        nextRun: null,
      });
    }

    // Ha befejeződött → WAITING
    if (row.status === "finished" && row.finished_at) {
      const lastRun = new Date(row.finished_at);
      const nextRun = calculateNextRun(lastRun);

      return NextResponse.json({
        status: "waiting",
        lastRun,
        nextRun,
      });
    }

    // Ha valami furcsa történik
    return NextResponse.json({
      status: "unknown",
      lastRun: null,
      nextRun: null,
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
