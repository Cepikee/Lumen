import { NextResponse } from "next/server";
import { getRuntimeConfig, type Capability } from "./runtime";

export function blockedCapabilityResponse(capabilities: Capability[]) {
  const config = getRuntimeConfig();
  const blocked = capabilities.find((name) => !config.capabilities[name]);
  if (!blocked) return null;

  return NextResponse.json(
    {
      error: "A művelet ebben a futási módban le van tiltva.",
      code: "UTOM_OPERATION_BLOCKED",
      capability: blocked,
      offlineMode: config.offlineMode,
    },
    { status: 503 },
  );
}
