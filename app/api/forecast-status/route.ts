import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// HELYES következő futás számítás
function calculateNextRun(finishedAt: Date) {
  return new Date(finishedAt.getTime() + (6 * 60 - 15) * 60_000);
}

export async function GET() {
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "utom_app",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "utom_dev",
    });

    const [rows] = await conn.execute(
      "SELECT status, finished_at FROM forecast_runs ORDER BY id DESC LIMIT 1"
    );

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
      if (Number.isNaN(lastRun.getTime())) {
        return NextResponse.json({
          status: "unknown",
          lastRun: null,
          nextRun: null,
        });
      }
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
  } finally {
    if (conn) {
      try { await conn.end(); } catch (closeError) {
        console.error("Forecast status DB close error:", closeError);
      }
    }
  }
}
