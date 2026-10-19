"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { runV2ShadowIntelligence } = require("../../lib/v2/shadow-intelligence");

const ENABLED = Object.freeze({
  UTOM_OFFLINE_MODE: "true",
  UTOM_V2_ENABLED: "true",
  UTOM_V2_SHADOW_ENABLED: "true",
  UTOM_PAID_AI_ENABLED: "false",
});

function article(overrides = {}) {
  return {
    id: 7,
    title: "Anna aláírta a szerződést",
    urlCanonical: "https://example.test/article-7",
    contentText: "Anna 35 embert alkalmaz.",
    contentHash: "content-7",
    sourceId: 3,
    source: "example.test",
    publishedAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-18T10:01:00.000Z",
    status: "done",
    processed: 1,
    ...overrides,
  };
}

function localProviders(calls = { entity: 0, claim: 0 }) {
  return {
    entityProvider: {
      name: "deterministic-semantic",
      model: "deterministic-semantic-entity-test",
      async extractEntities(input) {
        calls.entity += 1;
        const start = input.text.indexOf("Anna");
        return { entities: [{ mentionText: "Anna", normalizedCandidateName: "Anna", entityType: "person", confidence: 0.95, evidence: { start, end: start + 4 } }] };
      },
    },
    claimProvider: {
      name: "deterministic-semantic",
      model: "deterministic-semantic-claim-test",
      async extractClaims(input) {
        calls.claim += 1;
        const textSpan = "35 embert";
        const start = input.text.indexOf(textSpan);
        return { claims: [{ predicate: "EMPLOYEE_COUNT", claimType: "numeric", value: 35, normalizedValue: "35 ember", claimText: textSpan, confidence: 0.9, evidence: { start, end: start + textSpan.length, textSpan } }] };
      },
    },
  };
}

function harness(overrides = {}) {
  const state = { claimed: false, completed: false, failed: false, entities: [], resolutions: [], claims: [], relations: [], events: [], timeline: [] };
  const currentArticle = overrides.article || article();
  const repository = {
    async loadCompletedArticle() { return currentArticle; },
    async claim() {
      if (state.completed) return { status: "completed", fingerprint: "a".repeat(64), outputRef: "existing" };
      state.claimed = true;
      return { status: "claimed", fingerprint: "a".repeat(64), claimToken: "token" };
    },
    async complete() { state.completed = true; },
    async fail() { state.failed = true; },
    async withTransaction(work) { return work({}); },
    async withConnection(work) { return work({}); },
    ...(overrides.repository || {}),
  };
  const dependencies = {
    async persistEntityExtraction(_connection, input) {
      state.entities = input.outcome.result.entities;
      return { runId: 11, mentions: state.entities.map((entity, index) => ({ id: index + 21, ...entity })) };
    },
    async runEntityResolutionBatch(_connection, extraction) {
      state.resolutions = extraction.result.entities.map((entity, index) => ({ mentionText: entity.mentionText, result: { entityId: index + 31 } }));
      return { status: "completed", providerCalls: 0, results: state.resolutions };
    },
    async persistClaimsWithEvidence(_connection, input) {
      state.claims = input.claims;
      return { count: input.claims.length, claims: input.claims.map((_, index) => ({ claimId: index + 41, evidenceId: index + 51 })) };
    },
    async persistRelationWithEvidence(_connection, input) {
      state.relations.push(input);
      return { relationId: state.relations.length + 70, evidenceId: state.relations.length + 80, operationKey: input.operationKey };
    },
    async persistEventCandidate(_connection, candidate) {
      state.events.push(candidate);
      return { eventId: state.events.length + 60, articleId: candidate.articleId, entityCount: candidate.entities.length, status: candidate.status, merged: false };
    },
    async persistTimelineItem(_connection, projection) {
      const existing = state.timeline.find((row) => row.ownerId === projection.ownerId && row.item.itemId === projection.item.itemId && row.item.orderingKey === projection.item.orderingKey);
      if (existing) return { timelineId: 91, itemId: existing.id, idempotent: true };
      const row = { id: state.timeline.length + 101, ...projection };
      state.timeline.push(row);
      return { timelineId: 91, itemId: row.id, idempotent: false };
    },
    ...(overrides.dependencies || {}),
  };
  return { state, repository, dependencies };
}

test("shadow disabled performs no read, write, or provider work", async () => {
  let reads = 0;
  const result = await runV2ShadowIntelligence(null, 7, {
    env: { ...ENABLED, UTOM_V2_SHADOW_ENABLED: "false" },
    repository: { async loadCompletedArticle() { reads += 1; } },
  });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "disabled");
  assert.equal(reads, 0);
  assert.equal(result.externalProviderCalls, 0);
});

test("shadow orchestrator has no network or paid-provider dependency", () => {
  const source = fs.readFileSync("lib/v2/shadow-intelligence.js", "utf8");
  assert.doesNotMatch(source, /require\([^)]*(?:openai|cloudflare)/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /lib[\\/]v22|\.\.\/["']?v22/);
});

test("enabled shadow extracts, resolves, and persists evidence-backed claims", async () => {
  const calls = { entity: 0, claim: 0 };
  const providers = localProviders(calls);
  const flow = harness();
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  const retry = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "completed");
  assert.equal(retry.reason, "already_completed");
  assert.equal(flow.state.completed, true);
  assert.equal(flow.state.entities.length, 1);
  assert.equal(flow.state.resolutions.length, 1);
  assert.equal(flow.state.claims.length, 1);
  assert.deepEqual(calls, { entity: 1, claim: 1 });
  assert.equal(result.metrics.externalProviderCalls, 0);
  assert.equal(result.metrics.relationsFound, 0);
  assert.equal(result.metrics.relationsPersisted, 0);
  assert.equal(result.metrics.eventPreparation, "skipped");
  assert.equal(result.metrics.eventsFound, 0);
});

test("supported evidence-backed relation is persisted before the event stage", async () => {
  const textSpan = "Anna az Acme Kft. vezérigazgatója.";
  const flow = harness({ article: article({ title: textSpan, contentText: "Részletek." }) });
  const providers = localProviders();
  providers.entityProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-entity-relation",
    async extractEntities(input) {
      return { entities: [
        { mentionText: "Anna", normalizedCandidateName: "Anna", entityType: "person", confidence: 0.96, evidence: { start: input.text.indexOf("Anna"), end: input.text.indexOf("Anna") + 4 } },
        { mentionText: "Acme Kft.", normalizedCandidateName: "Acme", entityType: "organization", confidence: 0.96, evidence: { start: input.text.indexOf("Acme Kft."), end: input.text.indexOf("Acme Kft.") + 9 } },
      ] };
    },
  };
  providers.claimProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-claim-relation",
    async extractClaims(input) {
      const start = input.text.indexOf(textSpan);
      return { claims: [{ subjectEntityId: 31, predicate: "CEO_OF", objectEntityId: 32, claimType: "entity", confidence: 0.94, polarity: "affirmed", conditional: false, uncertainty: false, attributionType: "unknown", evidence: { start, end: start + textSpan.length, textSpan } }] };
    },
  };
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  const retry = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "completed");
  assert.equal(retry.reason, "already_completed");
  assert.equal(result.metrics.relationsFound, 1);
  assert.equal(result.metrics.relationsPersisted, 1);
  assert.equal(flow.state.relations.length, 1);
  assert.equal(flow.state.relations[0].relation.predicate, "CEO_OF");
  assert.equal(flow.state.relations[0].operationKey.length, 64);
});

test("relation/evidence transaction failure rolls back the candidate and preserves prior layers", async () => {
  const flow = harness();
  flow.repository.withTransaction = async (work) => {
    const relationCount = flow.state.relations.length;
    try { return await work({}); } catch (error) {
      flow.state.relations.length = relationCount;
      throw error;
    }
  };
  flow.dependencies.buildEvidenceBackedRelationCandidates = () => ({
    status: "completed",
    providerCalls: 0,
    skipped: [],
    candidates: [{
      relation: { subjectEntityId: 31, predicate: "CEO_OF", objectEntityId: 32, confidence: 0.9, supportType: "support", validFrom: null, validUntil: null, evidence: { start: 0, end: 4, textSpan: "Anna" } },
      operationKey: "b".repeat(64),
      semanticSource: { type: "validated_claim", claimId: 41, evidenceId: 51 },
    }],
  });
  flow.dependencies.persistRelationWithEvidence = async (_connection, input) => {
    flow.state.relations.push(input);
    throw new Error("fixture_relation_evidence_write_failed");
  };
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...localProviders(), repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /fixture_relation_evidence_write_failed/);
  assert.equal(flow.state.relations.length, 0);
  assert.equal(flow.state.entities.length, 1);
  assert.equal(flow.state.claims.length, 1);
  assert.equal(article().status, "done");
});

test("relation persistence is atomic at the shadow transaction boundary", async () => {
  let transactionDepth = 0;
  let persistedInsideTransaction = false;
  const relationClaim = { ...localProviders().claimProvider };
  relationClaim.extractClaims = async (input) => {
    const textSpan = "Anna az Acme Kft. vezérigazgatója.";
    const start = input.text.indexOf(textSpan);
    return { claims: [{ subjectEntityId: 31, predicate: "CEO_OF", objectEntityId: 32, claimType: "entity", confidence: 0.94, evidence: { start, end: start + textSpan.length, textSpan } }] };
  };
  const flow = harness({ article: article({ title: "Anna az Acme Kft. vezérigazgatója.", contentText: "Részletek." }) });
  flow.dependencies.runEntityResolutionBatch = async () => ({ status: "completed", providerCalls: 0, results: [{ result: { entityId: 31 } }, { result: { entityId: 32 } }] });
  flow.dependencies.persistEntityExtraction = async () => ({ runId: 11, mentions: [{ id: 21 }, { id: 22 }] });
  flow.repository.withTransaction = async (work) => {
    transactionDepth += 1;
    try { return await work({}); } finally { transactionDepth -= 1; }
  };
  flow.dependencies.persistRelationWithEvidence = async () => {
    persistedInsideTransaction = transactionDepth === 1;
    return { relationId: 71, evidenceId: 81 };
  };
  const entityProvider = {
    name: "deterministic-semantic", model: "deterministic-semantic-entity-relation-atomic",
    async extractEntities(input) { return { entities: [
      { mentionText: "Anna", normalizedCandidateName: "Anna", entityType: "person", confidence: 0.96, evidence: { start: input.text.indexOf("Anna"), end: input.text.indexOf("Anna") + 4 } },
      { mentionText: "Acme Kft.", normalizedCandidateName: "Acme", entityType: "organization", confidence: 0.96, evidence: { start: input.text.indexOf("Acme Kft."), end: input.text.indexOf("Acme Kft.") + 9 } },
    ] }; },
  };
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, entityProvider, claimProvider: relationClaim, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "completed");
  assert.equal(persistedInsideTransaction, true);
});

test("relation stage lifecycle is bounded and never logs article text", async () => {
  const logs = [];
  const flow = harness();
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...localProviders(), repository: flow.repository, dependencies: flow.dependencies, logger(event) { logs.push(event); } });
  assert.equal(result.status, "completed");
  assert.ok(logs.some((event) => event.event === "v2_shadow_relation_started"));
  assert.ok(logs.some((event) => event.event === "v2_shadow_relation_skipped"));
  assert.equal(logs.some((event) => JSON.stringify(event).includes(article().contentText)), false);
});

test("relation stage failure preserves completed V1 and already persisted entity/claim state", async () => {
  const flow = harness({ dependencies: { buildEvidenceBackedRelationCandidates() { throw new Error("fixture_relation_failed"); } } });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...localProviders(), repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_relation_failed:fixture_relation_failed/);
  assert.equal(flow.state.entities.length, 1);
  assert.equal(flow.state.claims.length, 1);
  assert.equal(flow.state.events.length, 0);
  assert.equal(flow.state.failed, true);
  assert.equal(article().status, "done");
  assert.equal(article().processed, 1);
});

test("malformed or provider-backed relation projection is rejected before relation write", async () => {
  let writes = 0;
  const flow = harness({ dependencies: {
    buildEvidenceBackedRelationCandidates() { return { candidates: [{ relation: {} }], skipped: [], providerCalls: 1 }; },
    async persistRelationWithEvidence() { writes += 1; },
  } });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...localProviders(), repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_relation_malformed_projection/);
  assert.equal(writes, 0);
});

test("supported evidence-backed event is persisted exactly once and rerun is reused", async () => {
  const textSpan = "Anna új buszokat vásárol.";
  const providers = localProviders();
  providers.entityProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-entity-event",
    async extractEntities(input) {
      const start = input.text.indexOf("Anna");
      return { entities: [{ mentionText: "Anna", normalizedCandidateName: "Anna", entityType: "person", confidence: 0.95, evidence: { start, end: start + 4 } }] };
    },
  };
  providers.claimProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-claim-event",
    async extractClaims(input) {
      const start = input.text.indexOf(textSpan);
      return { claims: [{ predicate: "BUS_PURCHASE", claimType: "text", value: "bus-purchase", confidence: 0.9, polarity: "affirmed", conditional: false, uncertainty: false, modality: "asserted", evidence: { start, end: start + textSpan.length, textSpan } }] };
    },
  };
  const flow = harness({ article: article({ title: textSpan, contentText: "Részletek." }) });
  const first = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  const second = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(first.status, "completed");
  assert.equal(first.metrics.eventsFound, 1);
  assert.equal(flow.state.events.length, 1);
  assert.equal(flow.state.events[0].evidenceId, 51);
  assert.equal(first.metrics.timelineItemsFound, 1);
  assert.equal(first.metrics.timelineItemsPersisted, 1);
  assert.equal(first.metrics.timelineItemsUnknownTime, 1);
  assert.equal(flow.state.timeline.length, 1);
  assert.equal(second.reason, "already_completed");
  assert.equal(flow.state.events.length, 1);
  assert.equal(flow.state.timeline.length, 1);
});

test("timeline stage persists explicit event time after event persistence", async () => {
  const textSpan = "Anna 1997-ben új buszokat vásárol.";
  const providers = localProviders();
  providers.claimProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-claim-timeline",
    async extractClaims(input) {
      const start = input.text.indexOf(textSpan);
      return { claims: [{ subjectEntityId: 31, predicate: "BUS_PURCHASE", claimType: "text", value: "bus-purchase", confidence: 0.9, polarity: "affirmed", modality: "asserted", validFrom: "1997", evidence: { start, end: start + textSpan.length, textSpan } }] };
    },
  };
  const flow = harness({ article: article({ title: textSpan, contentText: "Részletek.", publishedAt: "2026-10-19T10:00:00Z" }) });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "completed");
  assert.equal(flow.state.timeline.length, 1);
  assert.equal(flow.state.timeline[0].timePrecision, "year");
  assert.equal(flow.state.timeline[0].item.validAt, null);
  assert.equal(flow.state.timeline[0].item.validFrom, "1997-01-01T00:00:00.000Z");
});

test("timeline failure preserves V1 and every previously persisted shadow layer", async () => {
  const textSpan = "Anna új buszokat vásárol.";
  const providers = localProviders();
  providers.claimProvider = {
    name: "deterministic-semantic", model: "deterministic-semantic-claim-timeline-failure",
    async extractClaims(input) {
      const start = input.text.indexOf(textSpan);
      return { claims: [{ subjectEntityId: 31, predicate: "BUS_PURCHASE", claimType: "text", value: "bus-purchase", confidence: 0.9, evidence: { start, end: start + textSpan.length, textSpan } }] };
    },
  };
  const flow = harness({ article: article({ title: textSpan, contentText: "Részletek." }), dependencies: { async persistTimelineItem() { throw new Error("fixture_timeline_write_failed"); } } });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_timeline_failed:fixture_timeline_write_failed/);
  assert.equal(flow.state.entities.length, 1);
  assert.equal(flow.state.claims.length, 1);
  assert.equal(flow.state.events.length, 1);
  assert.equal(article().status, "done");
  assert.equal(article().processed, 1);
});

test("timeline stage emits bounded lifecycle logs without article text", async () => {
  const logs = [];
  const flow = harness();
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...localProviders(), repository: flow.repository, dependencies: flow.dependencies, logger(event) { logs.push(event); } });
  assert.equal(result.status, "completed");
  assert.ok(logs.some((event) => event.event === "v2_shadow_timeline_started"));
  assert.ok(logs.some((event) => event.event === "v2_shadow_timeline_skipped"));
  assert.equal(logs.some((event) => JSON.stringify(event).includes(article().contentText)), false);
});

test("event and memberships are persisted through the shadow transaction boundary", async () => {
  const textSpan = "Anna új buszokat vásárol.";
  const providers = localProviders();
  providers.claimProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-claim-atomic",
    async extractClaims(input) {
      const start = input.text.indexOf(textSpan);
      return { claims: [{ subjectEntityId: 31, predicate: "BUS_PURCHASE", claimType: "text", value: "bus-purchase", confidence: 0.9, evidence: { start, end: start + textSpan.length, textSpan } }] };
    },
  };
  let transactionDepth = 0;
  let persistedInsideTransaction = false;
  const flow = harness({ article: article({ title: textSpan, contentText: "Részletek." }) });
  flow.repository.withTransaction = async (work) => {
    transactionDepth += 1;
    try { return await work({}); } finally { transactionDepth -= 1; }
  };
  flow.dependencies.persistEventCandidate = async (_connection, candidate) => {
    persistedInsideTransaction = transactionDepth === 1;
    flow.state.events.push(candidate);
    return { eventId: 61, articleId: candidate.articleId, entityCount: 1, status: "candidate", merged: false };
  };
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "completed");
  assert.equal(persistedInsideTransaction, true);
});

test("event stage emits bounded structured lifecycle events without article text", async () => {
  const logs = [];
  const providers = localProviders();
  const flow = harness();
  const result = await runV2ShadowIntelligence(null, 7, {
    env: ENABLED,
    ...providers,
    repository: flow.repository,
    dependencies: flow.dependencies,
    logger(event) { logs.push(event); },
  });
  assert.equal(result.status, "completed");
  assert.ok(logs.some((event) => event.event === "v2_shadow_event_started"));
  assert.ok(logs.some((event) => event.event === "v2_shadow_event_skipped" && event.reason === "deferred_insufficient_evidence"));
  assert.equal(logs.some((event) => JSON.stringify(event).includes(article().contentText)), false);
});

test("event persistence failure preserves prior entity and claim output while shadow fails", async () => {
  const textSpan = "Anna új buszokat vásárol.";
  const providers = localProviders();
  providers.claimProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-claim-event-failure",
    async extractClaims(input) {
      const start = input.text.indexOf(textSpan);
      return { claims: [{ subjectEntityId: 31, predicate: "BUS_PURCHASE", claimType: "text", value: "bus-purchase", confidence: 0.9, polarity: "affirmed", evidence: { start, end: start + textSpan.length, textSpan } }] };
    },
  };
  const flow = harness({
    article: article({ title: textSpan, contentText: "Részletek." }),
    dependencies: { async persistEventCandidate() { throw new Error("fixture_event_write_failed"); } },
  });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_event_failed:fixture_event_write_failed/);
  assert.equal(flow.state.entities.length, 1);
  assert.equal(flow.state.claims.length, 1);
  assert.equal(flow.state.failed, true);
  assert.equal(flow.state.completed, false);
});

test("malformed event projection fails before event persistence", async () => {
  let eventWrites = 0;
  const providers = localProviders();
  const flow = harness({ dependencies: {
    buildEvidenceBackedEventCandidates() { return { status: "completed", candidates: [{ broken: true }], skipped: [] }; },
    async persistEventCandidate() { eventWrites += 1; },
  } });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_event_invalid_candidate/);
  assert.equal(eventWrites, 0);
});

test("shadow persistence failure is contained and marks only shadow state failed", async () => {
  const providers = localProviders();
  const flow = harness({ dependencies: { async persistEntityExtraction() { throw new Error("fixture_write_failed"); } } });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /fixture_write_failed/);
  assert.equal(flow.state.failed, true);
  assert.equal(flow.state.completed, false);
});

test("paid or unknown provider attempt is blocked before either provider is called", async () => {
  let paidCalls = 0;
  let repositoryCalls = 0;
  const paidProvider = { name: "openai", model: "paid", async extractEntities() { paidCalls += 1; return { entities: [] }; } };
  const { claimProvider } = localProviders();
  const result = await runV2ShadowIntelligence(null, 7, {
    env: { ...ENABLED, UTOM_PAID_AI_ENABLED: "true" },
    entityProvider: paidProvider,
    claimProvider,
    repository: { async loadCompletedArticle() { repositoryCalls += 1; } },
  });
  assert.equal(result.status, "paid_ai_blocked");
  assert.equal(paidCalls, 0);
  assert.equal(repositoryCalls, 0);
  assert.equal(result.externalProviderCalls, 0);
});

test("completed fingerprint rerun reuses shadow state without duplicate writes", async () => {
  const calls = { entity: 0, claim: 0 };
  const providers = localProviders(calls);
  const flow = harness();
  const first = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  const second = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(first.status, "completed");
  assert.equal(second.status, "skipped");
  assert.equal(second.reason, "already_completed");
  assert.deepEqual(calls, { entity: 1, claim: 1 });
  assert.equal(flow.state.entities.length, 1);
  assert.equal(flow.state.claims.length, 1);
});

test("empty completed article is skipped before claiming shadow state", async () => {
  const flow = harness({ article: article({ contentText: "   " }) });
  const providers = localProviders();
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "empty_article");
  assert.equal(flow.state.claimed, false);
});

test("malformed extraction fails without invoking persistence", async () => {
  let persisted = 0;
  const calls = { entity: 0, claim: 0 };
  const providers = localProviders(calls);
  providers.entityProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-entity-malformed",
    async extractEntities() { calls.entity += 1; return { entities: [{ mentionText: "ghost", normalizedCandidateName: "ghost", entityType: "person", confidence: 1, evidence: { start: 0, end: 5 } }] }; },
  };
  const flow = harness({ dependencies: { async persistEntityExtraction() { persisted += 1; } } });
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_entity_invalid_output/);
  assert.equal(persisted, 0);
  assert.equal(flow.state.failed, true);
  assert.deepEqual(calls, { entity: 1, claim: 0 });
});

test("unfinished V1 article is never eligible for shadow work", async () => {
  const flow = harness({ article: article({ status: "in_progress", processed: 0 }) });
  const providers = localProviders();
  const result = await runV2ShadowIntelligence(null, 7, { env: ENABLED, ...providers, repository: flow.repository, dependencies: flow.dependencies });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "article_not_completed");
  assert.equal(flow.state.claimed, false);
});

test("hung deterministic extraction is bounded and contained", async () => {
  const flow = harness();
  const providers = localProviders();
  providers.entityProvider = {
    name: "deterministic-semantic",
    model: "deterministic-semantic-entity-hung",
    async extractEntities() { return new Promise(() => {}); },
  };
  const result = await runV2ShadowIntelligence(null, 7, {
    env: ENABLED,
    ...providers,
    repository: flow.repository,
    dependencies: flow.dependencies,
    stageTimeoutMs: 10,
  });
  assert.equal(result.status, "failed");
  assert.match(result.error, /v2_shadow_timeout:entity/);
  assert.equal(flow.state.failed, true);
});
