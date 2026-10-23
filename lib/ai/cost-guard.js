"use strict";

const { getAiCostConfig, estimateReservedCostMicros } = require("./cost-config");
const { createMysqlAiCostRepository } = require("./cost-repository");

function utcParts(now = new Date()) {
  const iso = now.toISOString();
  return { usageDate: iso.slice(0, 10), usageMonth: iso.slice(0, 7) };
}

async function reserveAiCall({ pool, operationKey, articleId, stepName, kind, model, input, maxOutputTokens = 0, env = process.env, repository, now }) {
  if (!/^[a-f0-9]{64}$/i.test(String(operationKey || ""))) throw new Error("ai_cost_operation_key_invalid");
  if (!Number.isSafeInteger(Number(articleId)) || Number(articleId) <= 0) throw new Error("ai_cost_article_id_invalid");
  const config = getAiCostConfig(env);
  const expectedModel = kind === "embedding" ? config.embeddingModel : config.chatModel;
  if (model !== expectedModel) throw new Error("ai_cost_model_price_mismatch");
  const estimate = estimateReservedCostMicros({ input, maxOutputTokens, kind, config });
  const date = utcParts(now);
  const repo = repository || createMysqlAiCostRepository(pool);
  return repo.reserve({
    operationKey, pilotId: config.pilotId, articleId: Number(articleId), stepName, provider: "openai", model, kind,
    ...date, ...estimate, limits: config.limits, price: config.prices[kind], pricingVersion: config.pricingVersion,
    safetyMultiplierMillis: config.safetyMultiplierMillis, timeoutMs: config.timeoutMs,
  });
}

function readUsage(response, kind) {
  const usage = response?.usage;
  const inputTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens);
  const outputTokens = kind === "embedding" ? 0 : Number(usage?.completion_tokens ?? usage?.output_tokens);
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0) {
    throw new Error("ai_cost_provider_usage_missing");
  }
  const providerCost = response?._request_cost?.amount;
  return {
    inputTokens,
    outputTokens,
    providerReportedCostMicros: Number.isFinite(Number(providerCost)) ? Math.ceil(Number(providerCost) * 1_000_000) : null,
  };
}

async function executeReservedAiCall({ pool, reservation, providerCall, repository, logger = console.log }) {
  if (!reservation?.operationKey) throw new Error("ai_cost_reservation_required");
  const repo = repository || createMysqlAiCostRepository(pool);
  await repo.markStarted(reservation.operationKey);
  try {
    const response = await providerCall({ timeoutMs: reservation.timeoutMs });
    const usage = readUsage(response, reservation.kind);
    const cost = await repo.complete(reservation.operationKey, usage);
    logger(JSON.stringify({ event: "ai_cost_completed", operation: reservation.operationKey.slice(0, 12), articleId: reservation.articleId, step: reservation.stepName, model: reservation.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, estimatedCostHuf: reservation.reservedCostMicros / 1_000_000, actualCostHuf: cost.actualCostMicros / 1_000_000, providerReportedCostHuf: usage.providerReportedCostMicros == null ? null : usage.providerReportedCostMicros / 1_000_000 }));
    return response;
  } catch (error) {
    try { await repo.markUncertain(reservation.operationKey, error); } catch (ledgerError) {
      error.message = `${error.message}; ai_cost_uncertain_write_failed:${ledgerError.message}`;
    }
    logger(JSON.stringify({ event: "ai_cost_uncertain", operation: reservation.operationKey.slice(0, 12), articleId: reservation.articleId, step: reservation.stepName, reservedCostHuf: reservation.reservedCostMicros / 1_000_000 }));
    throw error;
  }
}

module.exports = { reserveAiCall, executeReservedAiCall, readUsage, utcParts };
