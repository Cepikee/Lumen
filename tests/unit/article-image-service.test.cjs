"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createImageService } = require("../../lib/article-images/service");
const { createCircuitBreaker } = require("../../lib/article-images/circuit-breaker");

function harness(overrides = {}) {
  const calls = { provider: 0, complete: [], budget: 0, prompt: 0, heartbeat: 0 };
  const article = overrides.article || { id: 9, title: "Kamatdöntés", short_summary: "A jegybank döntött.", category: "Gazdaság", force_revision: 0, image_created_at: "2026-10-17T00:00:00Z" };
  const repository = {
    load: async () => article,
    savePrompt: async () => { calls.prompt += 1; },
    findClusterReady: async () => overrides.cluster || null,
    reserveBudget: async () => { calls.budget += 1; return overrides.budget !== false; },
    heartbeat: async () => { calls.heartbeat += 1; },
    complete: async (_claim, details) => {
      if (overrides.completeError && calls.complete.length === 0) { calls.complete.push(details); throw overrides.completeError; }
      calls.complete.push(details);
    },
  };
  const provider = { generate: async () => { calls.provider += 1; if (overrides.providerError) throw overrides.providerError(calls.provider); return { bytes: Buffer.alloc(700, 1) }; } };
  const storage = {
    target: () => ({ storagePath: "2026/10/17/9-hashhashhash.webp" }),
    inspect: async (storagePath) => {
      if (overrides.recovered && storagePath.includes("hashhashhash")) return { storagePath, mimeType: "image/webp", width: 1024, height: 576, byteSize: 600 };
      if (overrides.cluster && storagePath === overrides.cluster.storage_path && overrides.exists !== false) return { storagePath, mimeType: "image/webp", width: 1024, height: 576, byteSize: 700 };
      return null;
    },
    save: async () => ({ storagePath: "2026/10/17/9-hash.webp", mimeType: "image/webp", width: 1024, height: 576, byteSize: 600 }),
  };
  const config = { enabled: true, provider: "cloudflare", model: "model", width: 1024, height: 576, maxRetries: 2, dailyBudget: 8000, estimatedNeurons: 800 };
  const service = createImageService({ repository, provider, storage, config: { ...config, ...overrides.config }, circuitBreaker: overrides.breaker || createCircuitBreaker({ failureThreshold: 5 }), sleep: async () => {} });
  return { service, calls, claim: { articleId: 9, workerId: "w", claimToken: "t" } };
}

test("successful generation persists a ready WebP result", async () => {
  const { service, calls, claim } = harness();
  const result = await service.process(claim);
  assert.equal(result.status, "ready");
  assert.equal(calls.provider, 1);
  assert.equal(calls.complete[0].sourceType, "generated");
  assert.equal(calls.complete[0].imageStatus, "ready");
});

test("provider retry is budgeted per attempt and article failure stays isolated", async () => {
  const errorFactory = (attempt) => Object.assign(new Error("temporary"), { code: "http_500", retryable: true, retryAfterMs: 0, attempt });
  const { service, calls, claim } = harness({ providerError: errorFactory });
  const result = await service.process(claim);
  assert.equal(result.status, "failed");
  assert.equal(calls.provider, 3);
  assert.equal(calls.budget, 3);
  assert.equal(calls.complete.at(-1).imageStatus, "failed");
});

test("disabled, sensitive and exhausted-budget jobs use fallback without provider traffic", async () => {
  const sensitive = harness({ article: { id: 9, title: "Szexuális erőszak ügye", force_revision: 0 } });
  assert.equal((await sensitive.service.process(sensitive.claim)).status, "fallback");
  assert.equal(sensitive.calls.provider, 0);
  const exhausted = harness({ budget: false });
  assert.equal((await exhausted.service.process(exhausted.claim)).reason, "daily_budget_exhausted");
  assert.equal(exhausted.calls.provider, 0);
});

test("ready cluster image is reused without budget or provider use", async () => {
  const { service, calls, claim } = harness({ cluster: { article_id: 8, storage_path: "2026/10/17/8-aaaaaaaaaaaa.webp", mime_type: "image/webp", width: 1024, height: 576, byte_size: 700 } });
  const result = await service.process(claim);
  assert.equal(result.reused, true);
  assert.equal(calls.provider, 0);
  assert.equal(calls.budget, 0);
  assert.equal(calls.complete[0].sourceType, "cluster_reuse");
  assert.equal(calls.complete[0].reusedFromArticleId, 8);
});

test("an existing fingerprinted file recovers DB state without provider or budget use", async () => {
  const { service, calls, claim } = harness({ recovered: true });
  const result = await service.process(claim);
  assert.equal(result.recovered, true);
  assert.equal(calls.provider, 0);
  assert.equal(calls.budget, 0);
  assert.equal(calls.complete[0].imageStatus, "ready");
});

test("terminal DB failure is propagated and does not overwrite the recoverable file with fallback", async () => {
  const failure = Object.assign(new Error("database unavailable"), { code: "ECONNRESET" });
  const { service, calls, claim } = harness({ completeError: failure });
  await assert.rejects(service.process(claim), /database unavailable/);
  assert.equal(calls.provider, 1);
  assert.equal(calls.complete.length, 1);
  assert.equal(calls.complete[0].imageStatus, "ready");
});

test("three provider failures open the shared breaker and prevent a fourth provider request", async () => {
  const breaker = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 60_000 });
  let providerCalls = 0;
  let last;
  for (let index = 0; index < 4; index += 1) {
    const run = harness({ breaker, config: { maxRetries: 0 }, providerError: () => {
      providerCalls += 1;
      return Object.assign(new Error("unauthorized"), { code: "http_401", retryable: false });
    } });
    last = await run.service.process({ ...run.claim, articleId: 9 + index });
  }
  assert.equal(providerCalls, 3);
  assert.equal(last.status, "fallback");
  assert.equal(last.reason, "provider_circuit_open");
});
