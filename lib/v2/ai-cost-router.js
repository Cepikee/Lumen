"use strict";

const { createHash } = require("node:crypto");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { AI_COST_POLICY, createBudgetContext } = require("./ai-cost-policy");

const ROUTES = Object.freeze(["deterministic", "cache", "small_model", "large_model", "review"]);
const REASONS = Object.freeze(["deterministic_precondition", "compatible_cache", "budget_exhausted", "per_article_limit", "per_step_limit", "circuit_open", "provider_unavailable", "malformed_output", "retry_exhausted", "budget_context_required", "escalation_required", "no_deterministic_path"]);
function invalid(errors) { return { status: "invalid", errors }; }
function fingerprint(value) { if (!/^[a-f0-9]{64}$/.test(String(value))) throw new TypeError("input_fingerprint_invalid"); return String(value); }
function boundedString(value, fieldName, max) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new TypeError(`${fieldName}_invalid`); return value.trim(); }
function finiteNonNegative(value, fieldName) { const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new TypeError(`${fieldName}_invalid`); return n; }
function integerLimit(value, fieldName) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 0) throw new TypeError(`${fieldName}_invalid`); return n; }
function normalizeBudget(input) {
  if (!input || typeof input !== "object") throw new TypeError("budget_context_required");
  const limits = input.limits || {};
  const usage = input.usage || {};
  const required = ["dailyCost", "monthlyCost", "perArticleCost", "perStepCost"];
  for (const key of required) { if (limits[key] == null) throw new TypeError(`budget_${key}_limit_required`); finiteNonNegative(limits[key], `budget_${key}_limit`); finiteNonNegative(usage[key] ?? 0, `budget_${key}_usage`); }
  const nextCost = input.nextCost == null ? 0 : finiteNonNegative(input.nextCost, "budget_next_cost");
  const exhausted = usage.dailyCost >= limits.dailyCost || usage.monthlyCost >= limits.monthlyCost || usage.perArticleCost >= limits.perArticleCost || usage.perStepCost >= limits.perStepCost || usage.dailyCost + nextCost > limits.dailyCost || usage.monthlyCost + nextCost > limits.monthlyCost || usage.perArticleCost + nextCost > limits.perArticleCost || usage.perStepCost + nextCost > limits.perStepCost;
  return { exhausted, limits, usage, nextCost };
}
function validateDecisionInput(input) {
  if (!input || typeof input !== "object") return invalid(["input_required"]);
  try {
    boundedString(input.step, "step", 64);
    fingerprint(input.inputFingerprint);
    normalizeBudget(input.budget);
    if (input.cacheHit != null && typeof input.cacheHit !== "boolean") throw new TypeError("cache_hit_invalid");
    if (input.deterministicEligible != null && typeof input.deterministicEligible !== "boolean") throw new TypeError("deterministic_eligible_invalid");
    if (input.circuit?.open != null && typeof input.circuit.open !== "boolean") throw new TypeError("circuit_state_invalid");
    if (input.largeEscalations != null && (!Number.isSafeInteger(Number(input.largeEscalations)) || Number(input.largeEscalations) < 0)) throw new TypeError("large_escalations_invalid");
    return { status: "valid" };
  } catch (error) { return invalid([error.message]); }
}
function decideRoute(input) {
  const valid = validateDecisionInput(input);
  if (valid.status !== "valid") return valid;
  const budget = normalizeBudget(input.budget);
  const circuitOpen = input.circuit?.open === true || Number(input.circuit?.failures || 0) >= Number(input.circuit?.failureThreshold || Infinity);
  let route = "review", reason = "no_deterministic_path", escalation = false;
  if (input.deterministicEligible === true) { route = "deterministic"; reason = "deterministic_precondition"; }
  else if (input.cacheHit === true) { route = "cache"; reason = "compatible_cache"; }
  else if (budget.exhausted) { reason = "budget_exhausted"; }
  else if (circuitOpen) { reason = "circuit_open"; }
  else if (input.providerAvailable === false) { reason = "provider_unavailable"; }
  else if (input.retryExhausted === true) { reason = "retry_exhausted"; }
  else if (input.escalate === true) {
    const largeAllowed = input.preferLargeModel === true && Number(input.largeEscalations || 0) < AI_COST_POLICY.maxLargeEscalationsPerArticle;
    route = largeAllowed ? "large_model" : "small_model"; reason = "escalation_required"; escalation = true;
  }
  const result = { contractVersion: CONTRACT_VERSIONS.costRouter, status: "decided", route, reason, escalation, inputFingerprint: input.inputFingerprint, step: input.step, budgetSnapshot: { limits: budget.limits, usage: budget.usage }, provider: route === "small_model" || route === "large_model" ? String(input.provider || "mock") : null, model: route === "small_model" || route === "large_model" ? String(input.model || (route === "small_model" ? "mock-small" : "mock-large")) : null };
  return { status: "valid", result: Object.freeze(result) };
}
function classifyProviderOutcome({ ok, malformed = false, unavailable = false, retryable = false, attempts = 0, maxAttempts = 0 } = {}) {
  if (ok === true) return { status: "completed", route: "provider" };
  if (malformed === true) return { status: "deferred", reason: "malformed_output", retry: attempts < maxAttempts };
  if (unavailable === true && attempts < maxAttempts) return { status: "deferred", reason: "provider_unavailable", retry: true };
  if (retryable === true && attempts < maxAttempts) return { status: "deferred", reason: "retry_exhausted", retry: true };
  return { status: "review", reason: "retry_exhausted", retry: false };
}
function decisionOperationKey(input) { return createHash("sha256").update(JSON.stringify([input.articleId ?? null, input.step, input.inputFingerprint, CONTRACT_VERSIONS.costRouter])).digest("hex"); }

module.exports = { ROUTES, REASONS, decisionOperationKey, validateDecisionInput, decideRoute, classifyProviderOutcome };
