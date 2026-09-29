export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { requireInternalWorker } from "@/lib/security/internal-worker";
import { getHealthSnapshot, redact } from "@/lib/operations";

export async function GET(request: Request) {
  const denied = requireInternalWorker(request);
  if (denied) return denied;
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 2,
  });
  try {
    const snapshot = await getHealthSnapshot(pool);
    return NextResponse.json(snapshot, { status: snapshot.readiness === false ? 503 : 200 });
  } catch (error) {
    console.error(JSON.stringify({ event: "health_query_failed", error: redact(error instanceof Error ? error.message : error) }));
    return NextResponse.json({ liveness: true, readiness: false, status: "critical", error: "health_unavailable" }, { status: 503 });
  } finally {
    await pool.end();
  }
}
