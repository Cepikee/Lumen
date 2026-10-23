"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { getAiCostConfig, estimateReservedCostMicros } = require("../../lib/ai/cost-config");
const { reserveAiCall, executeReservedAiCall } = require("../../lib/ai/cost-guard");

function env(overrides = {}) {
  return {
    AI_COST_GUARD_ENABLED: "true", AI_COST_PILOT_ENABLED: "true", AI_COST_PILOT_ID: "pilot-test",
    AI_COST_DAILY_LIMIT_HUF: "750", AI_COST_MONTHLY_LIMIT_HUF: "2000", AI_COST_PILOT_LIMIT_HUF: "2000",
    AI_COST_SAFETY_MULTIPLIER: "1.5", AI_COST_CHAT_MODEL: "gpt-test", AI_COST_EMBEDDING_MODEL: "embed-test",
    AI_COST_PRICING_VERSION: "operator-verified-test", AI_COST_CALL_TIMEOUT_MS: "60000",
    AI_COST_CHAT_INPUT_HUF_PER_MILLION: "100", AI_COST_CHAT_OUTPUT_HUF_PER_MILLION: "400",
    AI_COST_EMBEDDING_INPUT_HUF_PER_MILLION: "20", ...overrides,
  };
}

test("pilot configuration is fail-closed and capped at 2000 HUF", () => {
  assert.throws(() => getAiCostConfig(env({ AI_COST_GUARD_ENABLED: "false" })), /ai_cost_guard_not_explicitly_enabled/);
  assert.throws(() => getAiCostConfig(env({ AI_COST_CHAT_INPUT_HUF_PER_MILLION: "" })), /invalid/);
  assert.throws(() => getAiCostConfig(env({ AI_COST_PILOT_LIMIT_HUF: "2000.01" })), /too_high/);
  assert.throws(() => getAiCostConfig(env({ AI_COST_SAFETY_MULTIPLIER: "1.1" })), /too_low/);
  assert.equal(getAiCostConfig(env()).limits.pilotMicros, 2_000_000_000);
});

test("reservation estimate includes conservative byte bound and safety multiplier", () => {
  const config = getAiCostConfig(env());
  const estimate = estimateReservedCostMicros({ input: "árvíztűrő", maxOutputTokens: 100, kind: "chat", config });
  assert.ok(estimate.estimatedInputTokens >= Buffer.byteLength("árvíztűrő", "utf8") + 4096);
  assert.ok(estimate.reservedCostMicros > 0);
});

test("reserveAiCall creates the complete daily, monthly and pilot reservation specification", async () => {
  let captured;
  const repository = { async reserve(spec) { captured = spec; return spec; } };
  const operationKey = "a".repeat(64);
  await reserveAiCall({ repository, operationKey, articleId: 7, stepName: "title", kind: "chat", model: "gpt-test", input: "input", maxOutputTokens: 60, env: env(), now: new Date("2026-10-23T10:00:00Z") });
  assert.equal(captured.operationKey, operationKey);
  assert.equal(captured.usageDate, "2026-10-23");
  assert.equal(captured.usageMonth, "2026-10");
  assert.equal(captured.limits.pilotMicros, 2_000_000_000);
});

test("provider is called once and successful usage settles the reservation", async () => {
  const calls = [];
  const repository = {
    async markStarted(key) { calls.push(["started", key]); },
    async complete(key, usage) { calls.push(["completed", key, usage]); return { actualCostMicros: 50, reservedCostMicros: 100 }; },
    async markUncertain() { calls.push(["uncertain"]); },
  };
  let providerCalls = 0;
  const reservation = { operationKey: "b".repeat(64), kind: "chat", articleId: 7, stepName: "title", model: "gpt-test", reservedCostMicros: 100 };
  await executeReservedAiCall({ repository, reservation, logger() {}, providerCall: async () => { providerCalls += 1; return { usage: { prompt_tokens: 10, completion_tokens: 4 }, choices: [] }; } });
  assert.equal(providerCalls, 1);
  assert.deepEqual(calls.map((item) => item[0]), ["started", "completed"]);
});

test("timeout and missing usage become uncertain without a retry", async () => {
  for (const providerCall of [async () => { throw new Error("timeout"); }, async () => ({ choices: [] })]) {
    let providerCalls = 0;
    const states = [];
    const repository = { async markStarted() { states.push("started"); }, async complete() { states.push("completed"); }, async markUncertain() { states.push("uncertain"); } };
    await assert.rejects(executeReservedAiCall({ repository, reservation: { operationKey: "c".repeat(64), kind: "chat", articleId: 8, stepName: "keywords", model: "gpt-test", reservedCostMicros: 100 }, logger() {}, providerCall: async () => { providerCalls += 1; return providerCall(); } }));
    assert.equal(providerCalls, 1);
    assert.deepEqual(states, ["started", "uncertain"]);
  }
});

test("all eight canonical V1 paid steps receive cost contexts", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../pipeline/cron.js"), "utf8");
  for (const step of ["short_summary", "long_summary", "category", "sentiment", "title", "keywords", "clickbait", "embedding"]) {
    assert.match(source, new RegExp(`externalOptions\\(article, ["']${step}["']`));
  }
  assert.match(source, /callOpenAI\(prompt, 60, "title", titleOptions\.aiContext\)/);
  assert.match(source, /callOpenAI\(prompt, 80, "keywords", keywordOptions\.aiContext\)/);
});
