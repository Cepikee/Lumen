"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getImageConfig, validateImageConfig, resolveImageRolloutPolicy } = require("../../lib/article-images/config");

test("image generation stays disabled by default and requires credentials", () => {
  const disabled = getImageConfig({}, process.cwd());
  assert.equal(validateImageConfig(disabled).reason, "disabled");
  assert.equal(disabled.optimizeWithSharp, false);
  assert.equal(disabled.workerIdleMs, 2_000);
  assert.equal(disabled.minArticleId, null);
  assert.equal(disabled.backfillExisting, false);
  const missing = getImageConfig({ IMAGE_GEN_ENABLED: "true" }, process.cwd());
  assert.equal(validateImageConfig(missing).reason, "missing_provider_credentials");
});

test("automatic rollout is fail-safe, stable across restarts and requires an explicit cutoff or backfill opt-in", () => {
  const first = getImageConfig({ IMAGE_GEN_MIN_ARTICLE_ID: "112" }, process.cwd());
  const restarted = getImageConfig({ IMAGE_GEN_MIN_ARTICLE_ID: "112" }, process.cwd());
  assert.deepEqual(resolveImageRolloutPolicy(first), { minArticleId: 112, backfillExisting: false, mode: "cutoff" });
  assert.deepEqual(resolveImageRolloutPolicy(restarted), resolveImageRolloutPolicy(first));
  assert.throws(() => resolveImageRolloutPolicy(getImageConfig({}, process.cwd())), /image_rollout_cutoff_required/);
  assert.deepEqual(resolveImageRolloutPolicy(getImageConfig({ IMAGE_GEN_BACKFILL_EXISTING: "true" }, process.cwd())),
    { minArticleId: null, backfillExisting: true, mode: "explicit_backfill" });
  assert.deepEqual(resolveImageRolloutPolicy(getImageConfig({}, process.cwd()), { explicitArticleId: true }),
    { minArticleId: null, backfillExisting: true, mode: "explicit_article" });
});

test("legacy production daily-budget env alias remains compatible", () => {
  assert.equal(getImageConfig({ IMAGE_GEN_DAILY_BUDGET_NEURONS: "4321" }, process.cwd()).dailyBudget, 4_321);
  assert.equal(getImageConfig({ IMAGE_GEN_DAILY_NEURON_BUDGET: "1234", IMAGE_GEN_DAILY_BUDGET_NEURONS: "4321" }, process.cwd()).dailyBudget, 1_234);
});

test("continuous worker idle interval is bounded and invalid values use the safe default", () => {
  assert.equal(getImageConfig({ IMAGE_WORKER_IDLE_MS: "250" }, process.cwd()).workerIdleMs, 250);
  assert.equal(getImageConfig({ IMAGE_WORKER_IDLE_MS: "5000" }, process.cwd()).workerIdleMs, 5_000);
  assert.equal(getImageConfig({ IMAGE_WORKER_IDLE_MS: "249" }, process.cwd()).workerIdleMs, 250);
  assert.equal(getImageConfig({ IMAGE_WORKER_IDLE_MS: "not-a-number" }, process.cwd()).workerIdleMs, 2_000);
});

test("Sharp optimization requires explicit opt-in and is never part of readiness", () => {
  const config = getImageConfig({ IMAGE_GEN_ENABLED: "true", IMAGE_GEN_OPTIMIZE_WITH_SHARP: "true", CLOUDFLARE_ACCOUNT_ID: "account", CLOUDFLARE_AI_API_TOKEN: "token" }, process.cwd());
  assert.equal(config.optimizeWithSharp, true);
  assert.equal(validateImageConfig(config).ok, true);
});

test("Cloudflare token compatibility alias never becomes a public config field", () => {
  const config = getImageConfig({ IMAGE_GEN_ENABLED: "true", CLOUDFLARE_ACCOUNT_ID: "account", CLOUDFLARE_API_TOKEN: "secret" }, process.cwd());
  assert.equal(validateImageConfig(config).ok, true);
  assert.equal(config.apiToken, "secret");
  assert.equal(Object.prototype.hasOwnProperty.call(config, "NEXT_PUBLIC_CLOUDFLARE_API_TOKEN"), false);
});
