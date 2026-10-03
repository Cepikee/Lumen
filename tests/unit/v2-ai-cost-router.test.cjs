"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { decideRoute, validateDecisionInput, classifyProviderOutcome } = require("../../lib/v2/ai-cost-router");
const { runCostRouter } = require("../../lib/v2/runtime-ai-cost-router");
const { persistDecision } = require("../../lib/v2/ai-cost-router-repository");
const { AI_COST_POLICY, createBudgetContext, budgetWarnings } = require("../../lib/v2/ai-cost-policy");
const { getProviderConfig } = require("../../lib/v2/ai-provider-config");

const base = { articleId: 12, step: "claims", inputFingerprint: "a".repeat(64), budget: { limits: { dailyCost: 10, monthlyCost: 100, perArticleCost: 2, perStepCost: 1 }, usage: { dailyCost: 0, monthlyCost: 0, perArticleCost: 0, perStepCost: 0 } } };

test("M12 chooses deterministic and compatible cache before any model", () => {
  assert.equal(decideRoute({ ...base, deterministicEligible: true }).result.route, "deterministic");
  assert.equal(decideRoute({ ...base, cacheHit: true }).result.route, "cache");
});

test("M12 enforces explicit budget, circuit and provider fallback", () => {
  assert.equal(decideRoute({ ...base, escalate: true, budget: { ...base.budget, usage: { ...base.budget.usage, dailyCost: 10 } } }).result.reason, "budget_exhausted");
  assert.equal(decideRoute({ ...base, escalate: true, circuit: { open: true } }).result.reason, "circuit_open");
  assert.equal(decideRoute({ ...base, escalate: true, providerAvailable: false }).result.reason, "provider_unavailable");
  assert.equal(validateDecisionInput({ ...base, budget: null }).status, "invalid");
});

test("M12 escalates only when explicitly requested and preserves model route", () => {
  const result = decideRoute({ ...base, escalate: true, preferLargeModel: true, provider: "mock", model: "mock-large" });
  assert.deepEqual([result.result.route, result.result.escalation, result.result.provider, result.result.model], ["large_model", true, "mock", "mock-large"]);
});

test("M12 provider outcomes quarantine malformed output and bound retries", () => {
  assert.deepEqual(classifyProviderOutcome({ malformed: true, attempts: 0, maxAttempts: 2 }), { status: "deferred", reason: "malformed_output", retry: true });
  assert.equal(classifyProviderOutcome({ unavailable: true, attempts: 1, maxAttempts: 2 }).retry, true);
  assert.equal(classifyProviderOutcome({ unavailable: true, attempts: 2, maxAttempts: 2 }).status, "review");
});

test("M12 feature OFF is side-effect free and ON returns an auditable decision", () => {
  assert.equal(runCostRouter({ ...base, deterministicEligible: true }, { enabled: false }).reads, 0);
  assert.equal(runCostRouter({ ...base, deterministicEligible: true }, { enabled: true }).decision.route, "deterministic");
});

test("M12 decision repository is retry-safe and rejects nullable article identity", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/INSERT IGNORE INTO v2_ai_decisions/.test(sql)) return [{ insertId: 41, affectedRows: 1 }];
    if (/SELECT id,route,reason/.test(sql)) return [[{ id: 41, route: "deterministic", reason: "deterministic_precondition", escalation: 0 }], []];
    throw new Error("unexpected_sql");
  } };
  const persisted = await persistDecision(connection, { ...base, deterministicEligible: true });
  assert.equal(persisted.decisionId, 41);
  assert.equal(calls.some((call) => /COMMIT|ROLLBACK|START TRANSACTION/.test(call.sql)), false);
  await assert.rejects(() => persistDecision(connection, { ...base, articleId: null, deterministicEligible: true }), /article_id_required_for_persistence/);
});

test("Q09 enforces projected hard caps and approved policy boundaries", () => {
  assert.equal(AI_COST_POLICY.monthlySoftLimitHuf, 12000);
  assert.equal(AI_COST_POLICY.monthlyHardLimitHuf, 15000);
  assert.equal(decideRoute({ ...base, escalate: true, nextCost: 2, budget: createBudgetContext({ perArticleCost: 4 }, 2) }).result.reason, "budget_exhausted");
  assert.equal(decideRoute({ ...base, escalate: true, preferLargeModel: true, largeEscalations: 1 }).result.route, "small_model");
  assert.deepEqual(budgetWarnings(createBudgetContext({ dailyCost: 500, monthlyCost: 15000 })), ["monthly_soft_reached", "monthly_hard_reached", "daily_soft_reached", "daily_hard_reached"]);
});

test("Q09 keeps paid AI disabled outside explicit production opt-in", () => {
  assert.equal(getProviderConfig({ NODE_ENV: "test", UTOM_PAID_AI_ENABLED: "true", OPENAI_API_KEY: "x" }).paidEnabled, false);
  assert.equal(getProviderConfig({ NODE_ENV: "production", UTOM_PAID_AI_ENABLED: "true", OPENAI_API_KEY: "x" }).paidEnabled, true);
  assert.equal(getProviderConfig({ NODE_ENV: "production", UTOM_PAID_AI_ENABLED: "true", OPENAI_API_KEY: "x" }).secondaryProvider, null);
});

console.log("M12 AI cost router regression: PASS");
