import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { getCurrentPremiumEntitlement } from "@/lib/entitlements";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { envelope, errorEnvelope } from "@/lib/v2/read-model-contract";
import { compareSourcesDetailed, getClaim, getEvent } from "@/lib/v2/read-model-repository";
import { readTimelineItems } from "@/lib/v2/temporal-graph-repository";
import { projectPremiumIntelligence, validatePremiumInput } from "@/lib/v2/premium-intelligence";

export async function GET(req: Request) {
  const security = await securityCheck(req, { allowSameOriginRead: true });
  if (security) return security;
  if (!isV2Enabled()) return NextResponse.json(errorEnvelope("v2_disabled", "V2 premium intelligence is disabled"), { status: 404 });
  let entitlement;
  try { entitlement = await getCurrentPremiumEntitlement(); } catch (error) { console.error("Premium intelligence entitlement lookup failed:", error); return NextResponse.json(errorEnvelope("premium_unavailable", "Premium entitlement unavailable"), { status: 503 }); }
  if (entitlement.reason === "not_authenticated") return NextResponse.json(errorEnvelope("not_authenticated", "Authentication required"), { status: 401 });
  if (!entitlement.active) return NextResponse.json(errorEnvelope("premium_required", "Premium access required"), { status: 403 });
  const url = new URL(req.url);
  const validation: any = validatePremiumInput({ eventId: url.searchParams.get("eventId") || undefined, claimId: url.searchParams.get("claimId") || undefined, page: url.searchParams.get("page") || undefined, limit: url.searchParams.get("limit") || undefined });
  if (validation.status !== "valid") return NextResponse.json(errorEnvelope("invalid_input", validation.errors.join(", ")), { status: 422 });
  const input: any = validation.result;
  try {
    const comparison = await compareSourcesDetailed(db, input.scope, { page: input.page, limit: input.limit });
    const context = input.scope.type === "event" ? await getEvent(db, input.scope.id) : await getClaim(db, input.scope.id);
    if (!context) return NextResponse.json(errorEnvelope("not_found", "Premium intelligence scope not found"), { status: 404 });
    const [conflicts]: any = await db.execute("SELECT id,conflict_type conflictType,state,severity,detected_at detectedAt FROM v2_conflicts WHERE scope_type=? AND scope_id=? ORDER BY detected_at DESC,id DESC LIMIT 100", [input.scope.type, input.scope.id]);
    let history: any[] = [];
    if (input.scope.type === "event") {
      const timeline = await readTimelineItems(db, { ownerType: "event", ownerId: input.scope.id, asOf: new Date().toISOString(), limit: input.limit, visibility: "premium" });
      history = (timeline as any).items;
    }
    return NextResponse.json(envelope(projectPremiumIntelligence({ scope: input.scope, context, comparison, conflicts, history } as any)));
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "scope_not_found") return NextResponse.json(errorEnvelope("not_found", "Premium intelligence scope not found"), { status: 404 });
    if (message.endsWith("_invalid")) return NextResponse.json(errorEnvelope("invalid_input", message), { status: 422 });
    console.error("Premium intelligence read failed:", error);
    return NextResponse.json(errorEnvelope("internal_error", "Unable to load premium intelligence"), { status: 500 });
  }
}
