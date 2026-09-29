import { NextResponse } from "next/server";
import { isValidInternalToken } from "./internal-token";

/** Only trusted backend callers can start cost-bearing or data-writing work. */
export function requireInternalWorker(request: Request): NextResponse | null {
  const configured = process.env.UTOM_INTERNAL_WORKER_TOKEN;

  if (!configured || configured.length < 32) {
    return NextResponse.json(
      { error: "worker_unavailable" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidInternalToken(auth, configured)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

export function maintenanceUnavailable(): NextResponse {
  return NextResponse.json(
    { error: "maintenance_endpoint_disabled" },
    { status: 404 }
  );
}
