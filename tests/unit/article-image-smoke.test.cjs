"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { runSmoke } = require("../../scripts/cloudflare-image-smoke.cjs");

const config = {
  enabled: true, provider: "cloudflare", accountId: "account", apiToken: "token", model: "@cf/black-forest-labs/flux-2-klein-4b",
  width: 1024, height: 576, timeoutMs: 1000, maxRetries: 2, concurrency: 1, dailyBudget: 8000, estimatedNeurons: 800,
  staleMs: 60000, circuitFailures: 3, circuitCooldownMs: 60000, storageRoot: ".", optimizeWithSharp: false,
};

function smokeHarness(options = {}) {
  let claimed = false;
  let state = { article_id: 7, image_status: "pending", generation_status: "pending", source_type: null, storage_path: null, mime_type: null };
  const article = { id: 7, title: "Teszt hír", short_summary: "Biztonságos összefoglaló.", category: "Tech", force_revision: 1, retry_count: 0, image_created_at: "2026-10-17T00:00:00Z" };
  const repository = {
    enqueueCompleted: async () => 1,
    listSmokeCandidates: async () => options.alreadyReady ? [] : [{ ...article, image_status: "failed" }],
    resetForSmoke: async () => { state.image_status = "pending"; },
    claim: async () => { if (claimed) return null; claimed = true; state.image_status = "generating"; return { articleId: 7, workerId: "w", claimToken: "t" }; },
    load: async () => article,
    savePrompt: async () => {},
    findClusterReady: async () => null,
    heartbeat: async () => {},
    reserveBudget: async () => options.quota !== false,
    releaseRejectedBudget: async () => {},
    complete: async (_claim, details) => { state = { article_id: 7, image_status: details.imageStatus, generation_status: details.generationStatus,
      source_type: details.sourceType, storage_path: details.storagePath || null, mime_type: details.mimeType || null,
      last_error_code: details.errorCode || null, last_error_message: details.errorMessage || null,
      width: details.width || null, height: details.height || null, byte_size: details.byteSize || null }; },
    getImageState: async () => state,
  };
  const saved = { storagePath: "2026/10/17/7-aaaaaaaaaaaa.jpg", mimeType: "image/jpeg", width: 1024, height: 576, byteSize: 700 };
  const storage = {
    findExisting: async () => null,
    inspect: async (path) => path === saved.storagePath ? saved : null,
    save: async () => { if (options.storageFailure) throw new Error("disk full"); return saved; },
  };
  const provider = { name: "cloudflare", generate: async () => {
    if (options.providerStatus) throw Object.assign(new Error(`HTTP ${options.providerStatus}`), { code: `http_${options.providerStatus}`, status: options.providerStatus, retryable: false });
    if (options.invalidImage) return { bytes: Buffer.from("invalid") };
    return { bytes: Buffer.alloc(700), mimeType: "image/jpeg" };
  } };
  if (options.invalidImage) storage.save = async () => { throw new Error("invalid_image_bytes"); };
  return { pool: {}, repository, storage, provider, config };
}

test("real smoke passes only after one provider generation, ready DB state and a valid file", async () => {
  const report = await runSmoke(smokeHarness());
  assert.equal(report.providerRequests, 1);
  assert.equal(report.dbRow.image_status, "ready");
});

for (const status of [400, 401, 429, 500]) {
  test(`real smoke fails on provider HTTP ${status}`, async () => {
    await assert.rejects(runSmoke(smokeHarness({ providerStatus: status })), new RegExp(`image_not_generated:http_${status}`));
  });
}

test("real smoke fails on quota, storage and invalid-image fallback states", async () => {
  await assert.rejects(runSmoke(smokeHarness({ quota: false })), /image_not_generated:daily_budget_exhausted/);
  await assert.rejects(runSmoke(smokeHarness({ storageFailure: true })), /image_not_generated:storage_failed/);
  await assert.rejects(runSmoke(smokeHarness({ invalidImage: true })), /image_not_generated:storage_failed/);
});

test("an already-ready article cannot make the real provider smoke pass without a request", async () => {
  await assert.rejects(runSmoke(smokeHarness({ alreadyReady: true })), /no_eligible_non_ready_smoke_article/);
});
