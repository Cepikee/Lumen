"use strict";

const { isV2Enabled } = require("./feature-flags");
const { resolveEntityMention } = require("./entity-resolution-repository");
const { boundedDisambiguation } = require("./entity-resolution-candidates");

async function runEntityResolution(connection, input, options = {}) {
  const enabled = options.enabled ?? isV2Enabled();
  if (!enabled) return { status: "disabled", providerCalls: 0, repositoryCalls: 0, result: null };
  const base = await resolveEntityMention(connection, { ...input, enabled: true });
  const result = base.resolutionStatus === "ambiguous" && options.aiResolver
    ? await boundedDisambiguation(base, { resolver: options.aiResolver, context: input.context })
    : base;
  return { status: result.resolutionStatus, providerCalls: result.providerCalls || 0, repositoryCalls: 1, result };
}

async function runEntityResolutionBatch(connection, extractionResult, options = {}) {
  const enabled = options.enabled ?? isV2Enabled();
  if (!enabled) return { status: "disabled", providerCalls: 0, repositoryCalls: 0, results: [] };
  const entities = extractionResult?.result?.entities;
  if (!Array.isArray(entities)) return { status: "invalid_input", providerCalls: 0, repositoryCalls: 0, results: [] };
  const results = [];
  let providerCalls = 0;
  for (const entity of entities) {
    const outcome = await runEntityResolution(connection, {
      name: entity.normalizedCandidateName,
      entityType: entity.entityType,
      language: options.language || "hu",
      confidence: entity.confidence,
      context: options.context || {},
    }, options);
    providerCalls += outcome.providerCalls;
    results.push(Object.freeze({ mentionText: entity.mentionText, ...outcome }));
  }
  return { status: "completed", providerCalls, repositoryCalls: results.reduce((sum, result) => sum + result.repositoryCalls, 0), results };
}

module.exports = { runEntityResolution, runEntityResolutionBatch };
