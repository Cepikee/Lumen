import { NextResponse } from "next/server";

/**
 * S-02: Legacy maintenance endpoint disabled.
 * Do not restore without server-side authorization
 * and tests covering unauthorized requests.
 */
function disabled() {
  return NextResponse.json(
    { error: "maintenance_endpoint_disabled" },
    { status: 404 }
  );
}

export async function GET() {
  return disabled();
}

export async function POST() {
  return disabled();
}