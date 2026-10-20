import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { getCurrentPremiumEntitlement } from "@/lib/entitlements";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { envelope, errorEnvelope } from "@/lib/v2/read-model-contract";
import { compareSourcesDetailed, getClaim, getEvent } from "@/lib/v2/read-model-repository";
import { readTimelineItems } from "@/lib/v2/temporal-graph-repository";
import { projectPremiumIntelligence, validatePremiumInput } from "@/lib/v2/premium-intelligence";
import { detectComparisonConflicts } from "@/lib/v2/conflict-history";
import { resolveCrossArticleEventGroup } from "@/lib/v2/event-matching-repository";

function log(event: string, details: Record<string, unknown>) { console.info(JSON.stringify({ event, ...details })); }

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
    let eventMatching: any = null;
    if (input.scope.type === "event") {
      const matchStartedAt = Date.now();
      log("v2_event_match_started", { eventId: input.scope.id, externalProviderCalls: 0 });
      try {
        eventMatching = await resolveCrossArticleEventGroup(db, input.scope.id);
        for (const candidate of eventMatching.candidates || []) log("v2_event_match_candidate", { eventId: input.scope.id, candidateEventId: candidate.eventId, reason: candidate.reason, externalProviderCalls: 0 });
        for (const rejected of eventMatching.rejected || []) log("v2_event_match_rejected", { eventId: input.scope.id, candidateEventId: rejected.eventId, reason: rejected.reason, externalProviderCalls: 0 });
        log("v2_event_match_completed", { eventId: input.scope.id, ...eventMatching.metrics, matchDurationMs: Date.now() - matchStartedAt, externalProviderCalls: 0 });
      } catch (error: any) {
        log("v2_event_match_failed", { eventId: input.scope.id, code: String(error?.message || "internal_error"), matchDurationMs: Date.now() - matchStartedAt, externalProviderCalls: 0 });
        throw error;
      }
    }
    const comparison = await compareSourcesDetailed(db, input.scope, { page: input.page, limit: input.limit, eventIds: eventMatching?.eventIds });
    const context = input.scope.type === "event" ? await getEvent(db, input.scope.id) : await getClaim(db, input.scope.id);
    if (!context) return NextResponse.json(errorEnvelope("not_found", "Premium intelligence scope not found"), { status: 404 });
    const conflictStartedAt = Date.now();
    log("v2_conflict_detection_started", { scopeType: input.scope.type, scopeId: input.scope.id, externalProviderCalls: 0 });
    const conflictDetection = detectComparisonConflicts(comparison);
    log(conflictDetection.status === "ready" ? "v2_conflict_detection_completed" : "v2_conflict_detection_skipped", { scopeType: input.scope.type, scopeId: input.scope.id, ...conflictDetection.metrics, conflictDurationMs: Date.now() - conflictStartedAt, externalProviderCalls: 0 });
    let history: any[] = [];
    if (input.scope.type === "event") {
      const timeline = await readTimelineItems(db, { ownerType: "event", ownerId: input.scope.id, asOf: new Date().toISOString(), limit: input.limit, visibility: "premium" });
      history = (timeline as any).items;
    }
    return NextResponse.json(envelope({ ...projectPremiumIntelligence({ scope: input.scope, context, comparison, conflicts: conflictDetection.conflicts, conflictDetection, history } as any), eventMatching }));
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "scope_not_found") return NextResponse.json(errorEnvelope("not_found", "Premium intelligence scope not found"), { status: 404 });
    if (message.endsWith("_invalid")) return NextResponse.json(errorEnvelope("invalid_input", message), { status: 422 });
    log("v2_conflict_detection_failed", { scopeType: input.scope.type, scopeId: input.scope.id, code: "internal_error", externalProviderCalls: 0 });
    console.error("Premium intelligence read failed:", error);
    return NextResponse.json(errorEnvelope("internal_error", "Unable to load premium intelligence"), { status: 500 });
  }
}
