"use strict";

const path = require("node:path");

function bool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function int(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function getImageConfig(env = process.env, cwd = process.cwd()) {
  return Object.freeze({
    enabled: bool(env.IMAGE_GEN_ENABLED, false),
    provider: env.IMAGE_GEN_PROVIDER || "cloudflare",
    accountId: env.CLOUDFLARE_ACCOUNT_ID || "",
    apiToken: env.CLOUDFLARE_AI_API_TOKEN || env.CLOUDFLARE_API_TOKEN || "",
    model: env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-2-klein-4b",
    width: 1024,
    height: 576,
    quality: int(env.IMAGE_GEN_WEBP_QUALITY, 82, 60, 95),
    optimizeWithSharp: bool(env.IMAGE_GEN_OPTIMIZE_WITH_SHARP, false),
    timeoutMs: int(env.IMAGE_GEN_TIMEOUT_MS, 45_000, 5_000, 120_000),
    maxRetries: int(env.IMAGE_GEN_MAX_RETRIES, 2, 0, 2),
    concurrency: int(env.IMAGE_GEN_CONCURRENCY, 1, 1, 4),
    dailyBudget: int(env.IMAGE_GEN_DAILY_NEURON_BUDGET, 8_000, 0, 10_000_000),
    estimatedNeurons: int(env.IMAGE_GEN_ESTIMATED_NEURONS, 800, 1, 100_000),
    staleMs: int(env.IMAGE_GEN_CLAIM_STALE_MS, 15 * 60_000, 60_000, 86_400_000),
    circuitFailures: int(env.IMAGE_GEN_CIRCUIT_FAILURES, 3, 1, 20),
    circuitCooldownMs: int(env.IMAGE_GEN_CIRCUIT_COOLDOWN_MS, 5 * 60_000, 10_000, 3_600_000),
    storageRoot: path.resolve(cwd, env.IMAGE_GEN_STORAGE_ROOT || "public/article-images"),
  });
}

function validateImageConfig(config) {
  if (!config.enabled) return { ok: false, reason: "disabled" };
  if (config.provider !== "cloudflare") return { ok: false, reason: "unsupported_provider" };
  if (!config.accountId || !config.apiToken) return { ok: false, reason: "missing_provider_credentials" };
  return { ok: true };
}

module.exports = { getImageConfig, validateImageConfig };
