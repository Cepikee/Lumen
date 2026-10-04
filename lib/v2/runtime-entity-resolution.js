"use strict";

const { isV2Enabled } = require("./feature-flags");
const { resolveEntityMention, persistEntityResolution, onboardEntityMention, persistProvisionalEntityResolution } = require("./entity-resolution-repository");
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
  const shouldPersist = options.persist === true && Array.isArray(options.mentionIds);
  if (shouldPersist && options.mentionIds.length !== entities.length) throw new TypeError("mention_ids_mismatch");
  if (shouldPersist) await connection.beginTransaction();
  try {
    for (const [index, entity] of entities.entries()) {
      const input = {
        name: entity.normalizedCandidateName,
        entityType: entity.entityType,
        language: options.language || "hu",
        confidence: entity.confidence,
        context: options.context || {},
      };
      let outcome;
      if (shouldPersist) {
        const onboarded = await onboardEntityMention(connection, { ...input, mentionId: options.mentionIds[index], articleId: options.articleId, runId: options.runId, context: options.context || {} });
        if (onboarded.resolutionStatus === "resolved_exact" && !onboarded.provisional) {
          await persistEntityResolution(connection, { mentionId: options.mentionIds[index], result: onboarded, runId: options.runId });
        } else {
          await persistProvisionalEntityResolution(connection, { mentionId: options.mentionIds[index], result: onboarded, runId: options.runId });
        }
        outcome = { status: onboarded.resolutionStatus, providerCalls: 0, repositoryCalls: 2, result: onboarded };
      } else {
        outcome = await runEntityResolution(connection, input, options);
      }
      providerCalls += outcome.providerCalls;
      results.push(Object.freeze({ mentionText: entity.mentionText, ...outcome }));
    }
    if (shouldPersist) await connection.commit();
  } catch (error) {
    if (shouldPersist) await connection.rollback().catch(() => {});
    throw error;
  }
  return { status: "completed", providerCalls, repositoryCalls: results.reduce((sum, result) => sum + result.repositoryCalls, 0), results };
}

module.exports = { runEntityResolution, runEntityResolutionBatch };
