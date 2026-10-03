import { NextResponse } from "next/server";

/**
 * Retained only for backwards compatibility with old health/setup callers.
 * The old route never started a scheduler, so returning a success message was
 * misleading and made dead cron integrations look active.
 */
function disabled() {
  return NextResponse.json(
    { error: "legacy_init_endpoint_disabled", worker: "pipeline/cron.js" },
    { status: 410 },
  );
}

export async function GET() {
  return disabled();
}
