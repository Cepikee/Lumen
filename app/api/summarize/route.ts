import { NextResponse } from "next/server";

import { requireInternalWorker } from "@/lib/security/internal-worker";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(request: Request) {
  const denied = requireInternalWorker(request);

  if (denied) {
    return denied;
  }

  return NextResponse.json(
    { error: "canonical_pipeline_only", worker: "pipeline/cron.js" },
    { status: 409 },
  );
}
