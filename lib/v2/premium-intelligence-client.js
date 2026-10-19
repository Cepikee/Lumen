"use strict";
const id = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
function conflict(item) {
  if (!item || typeof item !== "object" || !/^[a-f0-9]{64}$/.test(String(item.fingerprint)) || !["numeric", "categorical"].includes(item.type) || item.state !== "open" || item.automaticWinner !== null) return null;
  const evidence = Array.isArray(item.evidence) ? item.evidence.filter((entry) => id(entry?.id) && id(entry?.claimId) && id(entry?.articleId) && id(entry?.sourceId) && typeof entry?.textSpan === "string" && entry.textSpan.trim()) : [];
  if (evidence.length < 2) return null;
  return Object.freeze({ fingerprint: item.fingerprint, type: item.type, reason: typeof item.reason === "string" ? item.reason : "potential_conflict", state: "open", severity: item.severity === "review" ? "review" : "review", sources: Array.isArray(item.sources) ? item.sources.filter((source) => id(source?.id) && typeof source?.key === "string" && typeof source?.name === "string") : [], claims: Array.isArray(item.claims) ? item.claims.filter((claim) => id(claim?.id) && id(claim?.articleId) && id(claim?.sourceId)) : [], evidence, temporal: item.temporal && typeof item.temporal === "object" ? item.temporal : null, attribution: Array.isArray(item.attribution) ? item.attribution : [], automaticWinner: null });
}
function normalizePremiumIntelligenceResponse(payload) {
  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") throw new TypeError("v2_premium_response_invalid");
  const data = payload.data;
  return Object.freeze({ status: data.status === "ready" ? "ready" : "empty", scope: data.scope && typeof data.scope === "object" ? Object.freeze({ type: data.scope.type === "event" ? "event" : "claim", id: Number(data.scope.id) }) : null, context: data.context && typeof data.context === "object" ? data.context : null, sourceComparison: data.sourceComparison && typeof data.sourceComparison === "object" ? data.sourceComparison : null, conflicts: Array.isArray(data.conflicts) ? data.conflicts.map(conflict).filter(Boolean) : [], conflictStatus: ["ready", "empty", "insufficient_evidence"].includes(data.conflictStatus) ? data.conflictStatus : "empty", history: Array.isArray(data.history) ? data.history : [] });
}
module.exports = { normalizePremiumIntelligenceResponse };
