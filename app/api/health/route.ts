import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", liveness: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
