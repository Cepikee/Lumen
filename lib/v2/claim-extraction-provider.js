"use strict";

const { extractClaims } = require("./deterministic-semantic");

function explicitTemporalStart(temporal) {
  if (!temporal || typeof temporal !== "object" || temporal.relative || temporal.weekday || temporal.sequence) return null;
  if (typeof temporal.resolvedTime === "string" && !Number.isNaN(Date.parse(temporal.resolvedTime))) return temporal.resolvedTime;
  if (!/^20\d{2}$/.test(String(temporal.year || ""))) return null;
  if (temporal.month != null) {
    const month = String(temporal.month).padStart(2, "0");
    return /^(0[1-9]|1[0-2])$/.test(month) ? `${temporal.year}-${month}` : null;
  }
  return String(temporal.year);
}

function createMockClaimProvider(options = {}) {
  const resultFactory = options.resultFactory || (() => ({ claims: [] }));
  if (typeof resultFactory !== "function") throw new TypeError("resultFactory must be a function");
  return Object.freeze({
    name: "mock",
    model: String(options.model || "deterministic-mock-claim-v1"),
    async extractClaims(input, context = {}) {
      if (!input || typeof input.text !== "string") throw new TypeError("provider_input_invalid");
      return resultFactory(Object.freeze({ text: input.text, contractVersion: input.contractVersion, context: Object.freeze({ requestId: context.requestId || null, runId: context.runId || null }) }));
    },
  });
}
function defaultClaimProvider() { return createMockClaimProvider(); }

function createDeterministicClaimProvider(options = {}) {
  return Object.freeze({
    name: "deterministic-semantic",
    model: String(options.model || "deterministic-semantic-claim-v1"),
    async extractClaims(input) {
      if (!input || typeof input.text !== "string") throw new TypeError("provider_input_invalid");
      return {
        claims: extractClaims(input.text).map((claim) => {
          const attributionType = claim.attribution?.type === "quoted" ? "quoted" : claim.attribution ? "reported" : "unknown";
          const value = claim.unit && typeof claim.value === "number" ? { amount: claim.value, unit: claim.unit } : claim.value;
          return {
            predicate: claim.predicate,
            claimType: claim.unit === "date" ? "temporal" : typeof claim.value === "number" ? "numeric" : typeof claim.value === "boolean" ? "boolean" : "text",
            value,
            normalizedValue: claim.unit ? `${claim.value} ${claim.unit}` : claim.value == null ? null : String(claim.value),
            claimText: claim.evidence,
            confidence: claim.predicate === "TEXT_ASSERTION" ? 0.55 : 0.9,
            supportType: claim.polarity === "negated" ? "contradict" : "support",
            attributionType,
            attribution: claim.attribution ? { type: attributionType, label: claim.attribution.label } : undefined,
            polarity: claim.polarity,
            uncertainty: claim.uncertainty,
            conditional: claim.conditional,
            modality: claim.modality,
            validFrom: explicitTemporalStart(claim.temporal),
            evidence: claim.evidenceSpan,
          };
        }),
      };
    },
  });
}
module.exports = { createMockClaimProvider, createDeterministicClaimProvider, defaultClaimProvider, explicitTemporalStart };
