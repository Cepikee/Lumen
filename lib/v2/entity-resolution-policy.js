"use strict";

const RESOLUTION_POLICY = Object.freeze({
  autoResolveMin: 0.95,
  reviewMin: 0.80,
});

function confidenceValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new TypeError("confidence_invalid");
  return value;
}

function applyResolutionPolicy(lookup, confidence) {
  if (!lookup || typeof lookup !== "object") throw new TypeError("lookup_invalid");
  if (lookup.status === "ambiguous") return Object.freeze({ ...lookup, resolutionStatus: "ambiguous" });
  if (lookup.status !== "resolved") return Object.freeze({ ...lookup, resolutionStatus: "unresolved" });
  const score = confidenceValue(confidence);
  const resolutionStatus = score >= RESOLUTION_POLICY.autoResolveMin
    ? "resolved_exact"
    : score >= RESOLUTION_POLICY.reviewMin ? "review" : "unresolved";
  return Object.freeze({ ...lookup, confidence: score, resolutionStatus });
}

module.exports = { RESOLUTION_POLICY, applyResolutionPolicy };
