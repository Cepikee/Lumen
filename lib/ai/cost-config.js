"use strict";

const MICROS_PER_HUF = 1_000_000;
const MAX_INITIAL_PILOT_HUF = 2_000;

class AiCostConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.name = "AiCostConfigurationError";
    this.code = "AI_COST_CONFIGURATION_INVALID";
  }
}

function enabled(value) {
  return new Set(["1", "true", "yes", "on"]).has(String(value || "").trim().toLowerCase());
}

function requiredText(env, name, pattern = /^.{1,128}$/u) {
  const value = String(env[name] || "").trim();
  if (!pattern.test(value)) throw new AiCostConfigurationError(`ai_cost_${name.toLowerCase()}_invalid`);
  return value;
}

function positiveNumber(env, name, options = {}) {
  const raw = String(env[name] ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) throw new AiCostConfigurationError(`ai_cost_${name.toLowerCase()}_invalid`);
  if (options.max != null && value > options.max) throw new AiCostConfigurationError(`ai_cost_${name.toLowerCase()}_too_high`);
  if (options.min != null && value < options.min) throw new AiCostConfigurationError(`ai_cost_${name.toLowerCase()}_too_low`);
  return value;
}

function toMicros(huf, field) {
  const value = Math.ceil(Number(huf) * MICROS_PER_HUF);
  if (!Number.isSafeInteger(value) || value <= 0) throw new AiCostConfigurationError(`ai_cost_${field}_invalid`);
  return value;
}

function getAiCostConfig(env = process.env) {
  if (!enabled(env.AI_COST_GUARD_ENABLED) || !enabled(env.AI_COST_PILOT_ENABLED)) {
    throw new AiCostConfigurationError("ai_cost_guard_not_explicitly_enabled");
  }
  const pilotId = requiredText(env, "AI_COST_PILOT_ID", /^[a-z0-9][a-z0-9._-]{2,63}$/i);
  const dailyHuf = positiveNumber(env, "AI_COST_DAILY_LIMIT_HUF", { max: MAX_INITIAL_PILOT_HUF });
  const monthlyHuf = positiveNumber(env, "AI_COST_MONTHLY_LIMIT_HUF", { max: MAX_INITIAL_PILOT_HUF });
  const pilotHuf = positiveNumber(env, "AI_COST_PILOT_LIMIT_HUF", { max: MAX_INITIAL_PILOT_HUF });
  if (dailyHuf > monthlyHuf || dailyHuf > pilotHuf || monthlyHuf > pilotHuf) {
    throw new AiCostConfigurationError("ai_cost_limit_order_invalid");
  }
  const safetyMultiplier = positiveNumber(env, "AI_COST_SAFETY_MULTIPLIER", { min: 1.25, max: 3 });
  const chatModel = requiredText(env, "AI_COST_CHAT_MODEL", /^[a-z0-9._:-]{2,128}$/i);
  const embeddingModel = requiredText(env, "AI_COST_EMBEDDING_MODEL", /^[a-z0-9._:-]{2,128}$/i);
  const pricingVersion = requiredText(env, "AI_COST_PRICING_VERSION", /^[a-z0-9._:-]{3,64}$/i);
  const timeoutMs = Math.trunc(positiveNumber(env, "AI_COST_CALL_TIMEOUT_MS", { min: 5_000, max: 180_000 }));
  const chatInput = positiveNumber(env, "AI_COST_CHAT_INPUT_HUF_PER_MILLION");
  const chatOutput = positiveNumber(env, "AI_COST_CHAT_OUTPUT_HUF_PER_MILLION");
  const embeddingInput = positiveNumber(env, "AI_COST_EMBEDDING_INPUT_HUF_PER_MILLION");
  return Object.freeze({
    pilotId,
    limits: Object.freeze({ dailyMicros: toMicros(dailyHuf, "daily_limit"), monthlyMicros: toMicros(monthlyHuf, "monthly_limit"), pilotMicros: toMicros(pilotHuf, "pilot_limit") }),
    safetyMultiplier,
    safetyMultiplierMillis: Math.ceil(safetyMultiplier * 1000),
    chatModel,
    embeddingModel,
    pricingVersion,
    timeoutMs,
    prices: Object.freeze({
      chat: Object.freeze({ inputMicrosPerMillion: toMicros(chatInput, "chat_input_price"), outputMicrosPerMillion: toMicros(chatOutput, "chat_output_price") }),
      embedding: Object.freeze({ inputMicrosPerMillion: toMicros(embeddingInput, "embedding_input_price"), outputMicrosPerMillion: 0 }),
    }),
  });
}

function estimateMaximumTokens(input, overheadBytes = 4096) {
  const bytes = Buffer.byteLength(String(input ?? ""), "utf8");
  const total = bytes + overheadBytes;
  if (!Number.isSafeInteger(total) || total <= 0) throw new AiCostConfigurationError("ai_cost_input_estimate_invalid");
  return total;
}

function tokenCostMicros(inputTokens, outputTokens, price) {
  const input = BigInt(inputTokens);
  const output = BigInt(outputTokens);
  const numerator = input * BigInt(price.inputMicrosPerMillion) + output * BigInt(price.outputMicrosPerMillion);
  const result = Number((numerator + 999_999n) / 1_000_000n);
  if (!Number.isSafeInteger(result) || result < 0) throw new AiCostConfigurationError("ai_cost_token_cost_overflow");
  return result;
}

function estimateReservedCostMicros({ input, maxOutputTokens, kind, config }) {
  if (!config?.prices?.[kind]) throw new AiCostConfigurationError("ai_cost_call_kind_invalid");
  const estimatedInputTokens = estimateMaximumTokens(input);
  const outputTokens = kind === "embedding" ? 0 : Number(maxOutputTokens);
  if (!Number.isSafeInteger(outputTokens) || outputTokens < 0) throw new AiCostConfigurationError("ai_cost_output_limit_invalid");
  const base = tokenCostMicros(estimatedInputTokens, outputTokens, config.prices[kind]);
  const reservedCostMicros = Math.max(1, Math.ceil(base * config.safetyMultiplier));
  if (!Number.isSafeInteger(reservedCostMicros)) throw new AiCostConfigurationError("ai_cost_reservation_overflow");
  return { estimatedInputTokens, reservedOutputTokens: outputTokens, reservedCostMicros };
}

module.exports = { MICROS_PER_HUF, MAX_INITIAL_PILOT_HUF, AiCostConfigurationError, getAiCostConfig, estimateMaximumTokens, tokenCostMicros, estimateReservedCostMicros };
