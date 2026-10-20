"use strict";

const { canonicalText } = require("./entity-extraction");
const { createDeterministicEntityProvider } = require("./entity-extraction-provider");
const { persistEntityExtraction } = require("./entity-extraction-repository");
const { createIngestionEnvelope } = require("./ingestion-envelope");
const { createV2RequestContext } = require("./request-context");
const { runEntityExtraction } = require("./runtime-entity-extraction");
const { runEntityResolutionBatch } = require("./runtime-entity-resolution");
const { createDeterministicClaimProvider } = require("./claim-extraction-provider");
const { runClaimExtraction } = require("./runtime-claim-extraction");
const { persistClaimsWithEvidence } = require("./claim-extraction-repository");
const { bindResolvedClaimEntities, canonicalResolutionEntityId } = require("./shadow-claim-binding");
const { buildEvidenceBackedRelationCandidates } = require("./shadow-relation-projection");
const { persistRelationWithEvidence } = require("./relation-extraction-repository");
const { buildEvidenceBackedEventCandidates } = require("./shadow-event-projection");
const { runEventMatching } = require("./runtime-event-matching");
const { persistEventCandidate } = require("./event-matching-repository");
const { buildArticleTimelineProjection } = require("./shadow-timeline-projection");
const { persistTimelineItem } = require("./temporal-graph-repository");
const { createBudgetContext } = require("./ai-cost-policy");
const { runCostRouter } = require("./runtime-ai-cost-router");
const { isV2ShadowEnabled } = require("./feature-flags");
const { createShadowIntelligenceRepository } = require("./shadow-intelligence-repository");

const DEFAULT_STAGE_TIMEOUT_MS = 15_000;
const LOCAL_PROVIDER = "deterministic-semantic";

function safeError(error) {
  return String(error?.message || error).slice(0, 500);
}

function emit(logger, event) {
  try { logger(event); } catch {}
}

function withTimeout(factory, timeoutMs, stage) {
  let timer;
  return Promise.race([
    Promise.resolve().then(factory),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`v2_shadow_timeout:${stage}`)), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

function isLocalDeterministicProvider(provider) {
  return provider?.name === LOCAL_PROVIDER && String(provider?.model || "").startsWith("deterministic-semantic-");
}

function skip(reason, articleId, logger, startedAt) {
  const result = { status: "skipped", reason, articleId: Number(articleId) || null, providerCalls: 0, externalProviderCalls: 0, durationMs: Date.now() - startedAt };
  emit(logger, { event: "v2_shadow_skipped", ...result });
  return result;
}

async function runV2ShadowIntelligence(pool, articleId, options = {}) {
  const startedAt = Date.now();
  const env = options.env || process.env;
  const logger = typeof options.logger === "function" ? options.logger : () => {};
  const timeoutMs = Number.isSafeInteger(options.stageTimeoutMs) && options.stageTimeoutMs > 0
    ? options.stageTimeoutMs
    : DEFAULT_STAGE_TIMEOUT_MS;

  if (!isV2ShadowEnabled(env)) return skip("disabled", articleId, logger, startedAt);

  const entityProvider = options.entityProvider || createDeterministicEntityProvider();
  const claimProvider = options.claimProvider || createDeterministicClaimProvider();
  if (!isLocalDeterministicProvider(entityProvider) || !isLocalDeterministicProvider(claimProvider)) {
    const result = { status: "paid_ai_blocked", articleId: Number(articleId) || null, providerCalls: 0, externalProviderCalls: 0, durationMs: Date.now() - startedAt };
    emit(logger, { event: "v2_shadow_paid_ai_blocked", ...result });
    return result;
  }

  const repository = options.repository || createShadowIntelligenceRepository(pool);
  const dependencies = {
    runEntityExtraction,
    persistEntityExtraction,
    runEntityResolutionBatch,
    runClaimExtraction,
    persistClaimsWithEvidence,
    bindResolvedClaimEntities,
    buildEvidenceBackedRelationCandidates,
    persistRelationWithEvidence,
    buildEvidenceBackedEventCandidates,
    runEventMatching,
    persistEventCandidate,
    buildArticleTimelineProjection,
    persistTimelineItem,
    runCostRouter,
    ...(options.dependencies || {}),
  };
  let claim = null;
  let article = null;
  let providerCalls = 0;

  try {
    article = await repository.loadCompletedArticle(articleId);
    if (!article) return skip("article_not_found", articleId, logger, startedAt);
    if (article.status !== "done" || Number(article.processed) !== 1) return skip("article_not_completed", articleId, logger, startedAt);
    if (typeof article.contentText !== "string" || !article.contentText.trim()) return skip("empty_article", articleId, logger, startedAt);
    if (typeof article.urlCanonical !== "string" || !article.urlCanonical.trim()) return skip("non_canonical_article", articleId, logger, startedAt);

    claim = await repository.claim(article);
    if (claim.status === "completed") return skip("already_completed", articleId, logger, startedAt);
    if (claim.status !== "claimed") return skip("already_processing", articleId, logger, startedAt);

    const route = dependencies.runCostRouter({
      articleId: Number(article.id),
      step: "v2.shadow_intelligence",
      inputFingerprint: claim.fingerprint,
      deterministicEligible: true,
      providerAvailable: false,
      budget: createBudgetContext({}, 0),
    }, { enabled: true, env });
    if (route?.status !== "completed" || route.decision?.route !== "deterministic" || Number(route.providerCalls) !== 0) {
      throw new Error("v2_shadow_paid_route_blocked");
    }

    emit(logger, { event: "v2_shadow_started", articleId: Number(article.id), step: "entity" });
    const context = createV2RequestContext({ articleId: article.id, env });
    const normalized = createIngestionEnvelope({
      originalUrl: article.urlCanonical,
      title: article.title,
      content: article.contentText,
      source: article.source,
      publishedAt: article.publishedAt,
      observedAt: new Date().toISOString(),
    }, { context });
    if (normalized.outcome !== "normalized") throw new Error(`v2_shadow_invalid_envelope:${normalized.reason}`);

    const extraction = await withTimeout(
      () => dependencies.runEntityExtraction(normalized.envelope, context, { enabled: true, provider: entityProvider }),
      timeoutMs,
      "entity",
    );
    providerCalls += Number(extraction?.providerCalls || 0);
    if (extraction?.status !== "completed") throw new Error(`v2_shadow_entity_${extraction?.status || "invalid"}`);

    const entityState = await repository.withTransaction((connection) => dependencies.persistEntityExtraction(connection, {
      articleId: Number(article.id),
      envelope: normalized.envelope,
      outcome: extraction,
    }));

    const resolution = await repository.withConnection((connection) => dependencies.runEntityResolutionBatch(connection, extraction, {
      enabled: true,
      persist: true,
      mentionIds: entityState.mentions.map((mention) => mention.id),
      articleId: Number(article.id),
      runId: entityState.runId,
      context,
      language: "hu",
    }));
    providerCalls += Number(resolution?.providerCalls || 0);
    if (resolution?.status !== "completed") throw new Error(`v2_shadow_resolution_${resolution?.status || "invalid"}`);

    emit(logger, { event: "v2_shadow_started", articleId: Number(article.id), step: "claim" });
    const claimExtraction = await withTimeout(
      () => dependencies.runClaimExtraction({
        text: canonicalText(normalized.envelope),
        articleId: Number(article.id),
        sourceId: article.sourceId == null ? null : Number(article.sourceId),
        extractionRunId: entityState.runId,
      }, context, { enabled: true, provider: claimProvider }),
      timeoutMs,
      "claim",
    );
    providerCalls += Number(claimExtraction?.providerCalls || 0);
    if (claimExtraction?.status !== "completed") throw new Error(`v2_shadow_claim_${claimExtraction?.status || "invalid"}`);

    const boundClaims = dependencies.bindResolvedClaimEntities({
      claims: claimExtraction.result.claims,
      entities: extraction.result.entities,
      resolutions: resolution.results,
    });
    if (!Array.isArray(boundClaims) || boundClaims.length !== claimExtraction.result.claims.length) {
      throw new Error("v2_shadow_claim_binding_mismatch");
    }

    const persistedClaims = await repository.withTransaction((connection) => dependencies.persistClaimsWithEvidence(connection, {
      claims: boundClaims,
      articleId: Number(article.id),
      sourceId: article.sourceId == null ? null : Number(article.sourceId),
      extractionRunId: entityState.runId,
      publicationTime: article.publishedAt || null,
      actor: "v2.shadow",
      operationKeyPrefix: claim.fingerprint,
    }));

    const relationStartedAt = Date.now();
    emit(logger, { event: "v2_shadow_relation_started", articleId: Number(article.id) });
    let relationProjection;
    let persistedRelations = [];
    try {
      relationProjection = dependencies.buildEvidenceBackedRelationCandidates({
        articleId: Number(article.id),
        claims: boundClaims,
        persistedClaims: persistedClaims.claims,
        entities: extraction.result.entities,
        resolutions: resolution.results,
      });
      if (!relationProjection || !Array.isArray(relationProjection.candidates) || !Array.isArray(relationProjection.skipped)
        || Number(relationProjection.providerCalls) !== 0) {
        throw new Error("v2_shadow_relation_malformed_projection");
      }
      if (relationProjection.candidates.length) {
        persistedRelations = await repository.withTransaction(async (connection) => {
          const rows = [];
          for (const candidate of relationProjection.candidates) {
            if (!candidate?.relation || !candidate?.operationKey || candidate?.semanticSource?.type !== "validated_claim") {
              throw new Error("v2_shadow_relation_invalid_candidate");
            }
            rows.push(await dependencies.persistRelationWithEvidence(connection, {
              relation: candidate.relation,
              articleId: Number(article.id),
              sourceId: article.sourceId == null ? null : Number(article.sourceId),
              extractionRunId: entityState.runId,
              actor: "v2.shadow.relation",
              operationKey: candidate.operationKey,
            }));
          }
          return rows;
        });
        emit(logger, {
          event: "v2_shadow_relation_completed",
          articleId: Number(article.id),
          relationCount: relationProjection.candidates.length,
          persistedCount: persistedRelations.length,
          skippedCount: relationProjection.skipped.length,
          durationMs: Date.now() - relationStartedAt,
        });
      } else {
        emit(logger, {
          event: "v2_shadow_relation_skipped",
          articleId: Number(article.id),
          reason: relationProjection.reason || "deferred_insufficient_evidence",
          skippedCount: relationProjection.skipped.length,
          durationMs: Date.now() - relationStartedAt,
        });
      }
    } catch (error) {
      emit(logger, {
        event: "v2_shadow_relation_failed",
        articleId: Number(article.id),
        reason: safeError(error),
        durationMs: Date.now() - relationStartedAt,
      });
      throw new Error(`v2_shadow_relation_failed:${safeError(error)}`);
    }

    const eventStartedAt = Date.now();
    emit(logger, { event: "v2_shadow_event_started", articleId: Number(article.id) });
    let eventProjection;
    let persistedEvents = [];
    try {
      eventProjection = dependencies.buildEvidenceBackedEventCandidates({
        articleId: Number(article.id),
        claims: boundClaims,
        persistedClaims: persistedClaims.claims,
        entities: extraction.result.entities,
        resolutions: resolution.results,
      });
      if (!eventProjection || !Array.isArray(eventProjection.candidates) || !Array.isArray(eventProjection.skipped)) {
        throw new Error("v2_shadow_event_malformed_projection");
      }
      const eventCandidates = eventProjection.candidates.map((candidate) => {
        const matched = dependencies.runEventMatching(candidate, { enabled: true });
        if (matched?.status !== "candidate" || !matched.candidate) throw new Error("v2_shadow_event_invalid_candidate");
        if (Number(matched.providerCalls) !== 0) throw new Error("v2_shadow_event_paid_route_blocked");
        return matched.candidate;
      });
      if (eventCandidates.length) {
        persistedEvents = await repository.withTransaction(async (connection) => {
          const rows = [];
          for (const candidate of eventCandidates) rows.push(await dependencies.persistEventCandidate(connection, candidate));
          return rows;
        });
        emit(logger, {
          event: "v2_shadow_event_completed",
          articleId: Number(article.id),
          eventCount: persistedEvents.length,
          skippedCount: eventProjection.skipped.length,
          durationMs: Date.now() - eventStartedAt,
        });
      } else {
        emit(logger, {
          event: "v2_shadow_event_skipped",
          articleId: Number(article.id),
          reason: eventProjection.reason || "deferred_insufficient_evidence",
          skippedCount: eventProjection.skipped.length,
          durationMs: Date.now() - eventStartedAt,
        });
      }
    } catch (error) {
      emit(logger, {
        event: "v2_shadow_event_failed",
        articleId: Number(article.id),
        reason: safeError(error),
        durationMs: Date.now() - eventStartedAt,
      });
      throw new Error(`v2_shadow_event_failed:${safeError(error)}`);
    }

    const timelineStartedAt = Date.now();
    emit(logger, { event: "v2_shadow_timeline_started", articleId: Number(article.id) });
    let timelineProjection;
    let persistedTimelineItems = [];
    try {
      timelineProjection = dependencies.buildArticleTimelineProjection({
        articleId: Number(article.id),
        eventCandidates: eventProjection.candidates,
        persistedEvents,
      });
      if (!timelineProjection || !Array.isArray(timelineProjection.items) || !Array.isArray(timelineProjection.skipped)
        || !Number.isSafeInteger(Number(timelineProjection.unknownTime)) || Number(timelineProjection.providerCalls) !== 0) {
        throw new Error("v2_shadow_timeline_malformed_projection");
      }
      if (timelineProjection.items.length) {
        persistedTimelineItems = await repository.withTransaction(async (connection) => {
          const rows = [];
          for (const projection of timelineProjection.items) {
            if (projection?.ownerType !== "article" || Number(projection?.ownerId) !== Number(article.id)
              || projection?.item?.itemType !== "event" || !projection?.provenance?.evidenceId) {
              throw new Error("v2_shadow_timeline_invalid_item");
            }
            rows.push(await dependencies.persistTimelineItem(connection, projection));
          }
          return rows;
        });
        emit(logger, {
          event: "v2_shadow_timeline_completed",
          articleId: Number(article.id),
          itemCount: timelineProjection.items.length,
          persistedCount: persistedTimelineItems.length,
          unknownTimeCount: timelineProjection.unknownTime,
          skippedCount: timelineProjection.skipped.length,
          durationMs: Date.now() - timelineStartedAt,
        });
      } else {
        emit(logger, {
          event: "v2_shadow_timeline_skipped",
          articleId: Number(article.id),
          reason: timelineProjection.reason || "no_authoritative_events",
          skippedCount: timelineProjection.skipped.length,
          durationMs: Date.now() - timelineStartedAt,
        });
      }
    } catch (error) {
      emit(logger, {
        event: "v2_shadow_timeline_failed",
        articleId: Number(article.id),
        reason: safeError(error),
        durationMs: Date.now() - timelineStartedAt,
      });
      throw new Error(`v2_shadow_timeline_failed:${safeError(error)}`);
    }

    const canonicalEntityIds = new Set(resolution.results.map(canonicalResolutionEntityId).filter(Boolean));
    const canonicalSubjectBindings = boundClaims.filter((item) => canonicalEntityIds.has(Number(item?.subjectEntityId))).length;
    const canonicalObjectBindings = boundClaims.filter((item) => canonicalEntityIds.has(Number(item?.objectEntityId))).length;
    const metrics = {
      processed: 1,
      succeeded: 1,
      failed: 0,
      skipped: 0,
      entitiesFound: extraction.result.entities.length,
      entitiesExtracted: extraction.result.entities.length,
      entitiesPersisted: entityState.mentions.length,
      entitiesResolved: canonicalEntityIds.size,
      entitiesCanonicallyResolved: canonicalEntityIds.size,
      canonicalSubjectBindings,
      canonicalObjectBindings,
      claimsFound: persistedClaims.count,
      claimsWithEvidence: persistedClaims.claims.filter((item) => item?.claimId && item?.evidenceId).length,
      relationsFound: relationProjection.candidates.length,
      relationsPersisted: persistedRelations.length,
      relationsSkipped: relationProjection.skipped.length,
      relationDurationMs: Date.now() - relationStartedAt,
      eventsFound: persistedEvents.length,
      eventsSkipped: eventProjection.skipped.length,
      eventDurationMs: Date.now() - eventStartedAt,
      eventPreparation: eventProjection.status,
      timelineItemsFound: timelineProjection.items.length,
      timelineItemsPersisted: persistedTimelineItems.length,
      timelineItemsUnknownTime: timelineProjection.unknownTime,
      timelineUnknownTime: timelineProjection.unknownTime,
      timelineItemsSkipped: timelineProjection.skipped.length,
      timelineDurationMs: Date.now() - timelineStartedAt,
      costRoute: route.decision.route,
      providerCalls,
      externalProviderCalls: 0,
      durationMs: Date.now() - startedAt,
    };
    await repository.complete({
      articleId: Number(article.id),
      fingerprint: claim.fingerprint,
      claimToken: claim.claimToken,
      outputRef: `v2-shadow:article:${article.id}:run:${entityState.runId}`,
    });
    const result = { status: "completed", articleId: Number(article.id), metrics };
    emit(logger, { event: "v2_shadow_completed", ...result });
    return result;
  } catch (error) {
    if (claim?.status === "claimed") {
      await repository.fail({
        articleId: Number(article?.id || articleId),
        fingerprint: claim.fingerprint,
        claimToken: claim.claimToken,
        error,
      }).catch(() => {});
    }
    const result = {
      status: "failed",
      articleId: Number(article?.id || articleId) || null,
      error: safeError(error),
      providerCalls,
      externalProviderCalls: 0,
      durationMs: Date.now() - startedAt,
    };
    emit(logger, { event: "v2_shadow_failed", ...result });
    return result;
  }
}

module.exports = {
  DEFAULT_STAGE_TIMEOUT_MS,
  LOCAL_PROVIDER,
  isLocalDeterministicProvider,
  runV2ShadowIntelligence,
  withTimeout,
};
