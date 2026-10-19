import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityCheck } from "@/lib/security";
import { isV2Enabled } from "@/lib/v2/feature-flags";
import { envelope, errorEnvelope } from "@/lib/v2/read-model-contract";
import { compareSources, compareSourcesDetailed } from "@/lib/v2/read-model-repository";
import { detectComparisonConflicts } from "@/lib/v2/conflict-history";

function log(event: string, details: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...details }));
}

export async function GET(req: Request) {
  const security = await securityCheck(req, { allowSameOriginRead: true });
  if (security) return security;
  if (!isV2Enabled()) return NextResponse.json(errorEnvelope("v2_disabled", "V2 read models are disabled"), { status: 404 });
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const claimId = url.searchParams.get("claimId");
  const detail = url.searchParams.get("detail");
  if ((eventId && claimId) || (!eventId && !claimId)) return NextResponse.json(errorEnvelope("invalid_input", "exactly_one_scope_required"), { status: 422 });
  if (detail !== null && detail !== "claims") return NextResponse.json(errorEnvelope("invalid_input", "detail_invalid"), { status: 422 });
  const scope = eventId ? { type: "event", id: eventId } : { type: "claim", id: claimId };
  const startedAt = Date.now();
  log("v2_source_comparison_started", { scopeType: scope.type, scopeId: scope.id, detail: detail || "sources" });
  try {
    if (detail === "claims") {
      const data = await compareSourcesDetailed(db, scope, { page: url.searchParams.get("page") || undefined, limit: url.searchParams.get("limit") || undefined });
      const conflictStartedAt = Date.now();
      log("v2_conflict_detection_started", { scopeType: scope.type, scopeId: scope.id, externalProviderCalls: 0 });
      const conflictDetection = detectComparisonConflicts(data);
      log(conflictDetection.status === "ready" ? "v2_conflict_detection_completed" : "v2_conflict_detection_skipped", { scopeType: scope.type, scopeId: scope.id, ...conflictDetection.metrics, conflictDurationMs: Date.now() - conflictStartedAt, externalProviderCalls: 0 });
      log(data.status === "ready" ? "v2_source_comparison_completed" : "v2_source_comparison_skipped", { scopeType: scope.type, scopeId: scope.id, ...data.metrics, comparisonDurationMs: Date.now() - startedAt, externalProviderCalls: 0 });
      return NextResponse.json(envelope({ ...data, conflictDetection }));
    }
    const data = await compareSources(db, scope);
    log("v2_source_comparison_completed", { scopeType: scope.type, scopeId: scope.id, sourcesCompared: data.sources.length, claimsCompared: 0, sharedClaims: 0, sourceOnlyClaims: 0, unmatchedClaims: 0, comparisonDurationMs: Date.now() - startedAt, externalProviderCalls: 0 });
    return NextResponse.json(envelope(data));
  } catch (error: any) {
    const message = String(error?.message || "");
    const invalid = message.endsWith("_invalid") || message === "scope_not_found";
    if (detail === "claims") log("v2_conflict_detection_failed", { scopeType: scope.type, scopeId: scope.id, code: message === "scope_not_found" ? "not_found" : invalid ? "invalid_input" : "internal_error", conflictDurationMs: Date.now() - startedAt, externalProviderCalls: 0 });
    log("v2_source_comparison_failed", { scopeType: scope.type, scopeId: scope.id, code: message === "scope_not_found" ? "not_found" : invalid ? "invalid_input" : "internal_error", comparisonDurationMs: Date.now() - startedAt, externalProviderCalls: 0 });
    return NextResponse.json(errorEnvelope(message === "scope_not_found" ? "not_found" : invalid ? "invalid_input" : "internal_error", message === "scope_not_found" ? "Comparison scope not found" : invalid ? message : "Unable to compare sources"), { status: message === "scope_not_found" ? 404 : invalid ? 422 : 500 });
  }
}
