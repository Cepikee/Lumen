"use strict";
function normalizePremiumIntelligenceResponse(payload) {
  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") throw new TypeError("v2_premium_response_invalid");
  const data = payload.data;
  return Object.freeze({ status: data.status === "ready" ? "ready" : "empty", scope: data.scope && typeof data.scope === "object" ? Object.freeze({ type: data.scope.type === "event" ? "event" : "claim", id: Number(data.scope.id) }) : null, context: data.context && typeof data.context === "object" ? data.context : null, sourceComparison: data.sourceComparison && typeof data.sourceComparison === "object" ? data.sourceComparison : null, conflicts: Array.isArray(data.conflicts) ? data.conflicts : [], history: Array.isArray(data.history) ? data.history : [] });
}
module.exports = { normalizePremiumIntelligenceResponse };
