"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCrossArticleEventGroup } = require("../../lib/v2/event-matching.js");
const { createDeterministicEntityProvider } = require("../../lib/v2/entity-extraction-provider.js");
const { resolveEntityMention } = require("../../lib/v2/entity-resolution-repository.js");
const { createDeterministicClaimProvider } = require("../../lib/v2/claim-extraction-provider.js");
const { validateClaimResult } = require("../../lib/v2/claim-extraction.js");
const { bindResolvedClaimEntities } = require("../../lib/v2/shadow-claim-binding.js");
const { buildEvidenceBackedEventCandidates } = require("../../lib/v2/shadow-event-projection.js");
const { buildArticleTimelineProjection } = require("../../lib/v2/shadow-timeline-projection.js");
const { runEventMatching } = require("../../lib/v2/runtime-event-matching.js");
const { buildSourceComparison } = require("../../lib/v2/source-comparison.js");
const {
  SYNTHETIC_POSITIVE_FIXTURES, assertAcceptanceDatabaseName, assertAcceptanceOptIn, assertAcceptanceProvider, assertProductionReadSql,
  classifyAcceptanceResult, createAcceptanceDatabaseController, createProductionReadAdapter, hasSyntheticCanonicalResolution, hasSyntheticSemanticCoverage,
  parseAcceptanceMode, parseArticleIds, validateArticleFixtures,
} = require("../../lib/acceptance/v2-vps-harness.js");

const CANONICAL_ENTITIES = Object.freeze([
  Object.freeze({ id: 101, entity_type: "organization", canonical_name: "BKK Zrt.", normalized_name: "bkk", language: "hu", status: "accepted" }),
  Object.freeze({ id: 102, entity_type: "project", canonical_name: "Zöld Busz Program", normalized_name: "zöld busz program", language: "hu", status: "accepted" }),
]);

function canonicalLookupConnection(rows = CANONICAL_ENTITIES) {
  return { async execute(sql, params) {
    if (/FROM v2_entities\s+WHERE/u.test(sql)) {
      const [type, language, normalized] = params;
      return [rows.filter((row) => row.entity_type === type && row.language === language && row.normalized_name === normalized), []];
    }
    if (/FROM v2_entity_aliases/u.test(sql)) return [[], []];
    if (/LEFT JOIN v2_entity_aliases/u.test(sql)) return [[], []];
    throw new Error(`unexpected_entity_lookup:${sql}`);
  } };
}

async function resolveFixtureEntities(entities, rows = CANONICAL_ENTITIES) {
  const connection = canonicalLookupConnection(rows);
  const results = [];
  for (const entity of entities) {
    const result = await resolveEntityMention(connection, {
      name: entity.normalizedCandidateName,
      entityType: entity.entityType,
      language: "hu",
      confidence: entity.confidence,
    });
    results.push({ mentionText: entity.mentionText, status: result.resolutionStatus, result: { ...result, entityStatus: result.entity?.status || null, provisional: false } });
  }
  return results;
}

test("production writes are rejected before reaching the connection", async () => {
  let calls = 0; const raw = { async query() { calls += 1; }, async execute() { calls += 1; } };
  const db = createProductionReadAdapter(raw);
  await assert.rejects(() => db.execute("INSERT INTO articles VALUES (?)", [1]), /production_write_rejected:INSERT/);
  assert.equal(calls, 0);
});
test("production SELECT, SHOW, DESCRIBE and EXPLAIN are allowed", async () => {
  const seen = []; const raw = { async query(sql) { seen.push(sql); return [[], []]; }, async execute(sql) { seen.push(sql); return [[], []]; } };
  const db = createProductionReadAdapter(raw);
  for (const sql of ["SELECT 1", "SHOW TABLES", "DESCRIBE articles", "EXPLAIN SELECT 1"]) await db.query(sql);
  assert.equal(seen.length, 4); assert.equal(assertProductionReadSql("/* audit */ SELECT 1"), "SELECT");
});
test("production read allowlist rejects stacked statements, locks and server-side file writes", () => {
  assert.throws(() => assertProductionReadSql("SELECT 1; UPDATE articles SET title='x'"), /unsafe_read_shape/);
  assert.throws(() => assertProductionReadSql("SELECT * FROM articles FOR UPDATE"), /unsafe_read_shape/);
  assert.throws(() => assertProductionReadSql("SELECT title INTO OUTFILE '/tmp/x' FROM articles"), /unsafe_read_shape/);
});
test("acceptance writes require explicit opt-in and a safe database name", async () => {
  assert.throws(() => assertAcceptanceOptIn({}, "utom_acceptance_ok"), /opt_in/);
  assert.equal(assertAcceptanceOptIn({ UTOM_ACCEPTANCE_RUN: "true" }, "utom_acceptance_run1"), "utom_acceptance_run1");
  assert.throws(() => assertAcceptanceDatabaseName("utom"), /unsafe/);
});
test("safe controller creates and drops only the guarded acceptance database", async () => {
  const sql = []; const connection = { async query(value) { sql.push(value); } };
  const controller = createAcceptanceDatabaseController(connection, { env: { UTOM_ACCEPTANCE_RUN: "true" }, databaseName: "utom_acceptance_test1" });
  await controller.create(); await controller.drop();
  assert.match(sql[0], /^CREATE DATABASE `utom_acceptance_test1`/); assert.equal(sql[1], "DROP DATABASE IF EXISTS `utom_acceptance_test1`");
  assert.throws(() => createAcceptanceDatabaseController(connection, { env: { UTOM_ACCEPTANCE_RUN: "true" }, databaseName: "production" }), /unsafe/);
});
test("mode and article selection require two explicit production IDs without a global three-article minimum", () => {
  assert.equal(parseAcceptanceMode("production-negative"), "production-negative");
  assert.equal(parseAcceptanceMode("synthetic-positive"), "synthetic-positive");
  assert.throws(() => parseAcceptanceMode(""), /mode_required/);
  assert.deepEqual(parseArticleIds("1,2"), [1, 2]);
  assert.throws(() => parseArticleIds("1,1"), /duplicate/); assert.throws(() => parseArticleIds("1"), /at_least_2/);
});
test("fixture validation rejects missing articles, text and same-source selection before fixture creation", () => {
  const row = (id, sourceId) => ({ id, sourceId, sourceSlug: `s${sourceId}`, contentText: "body", urlCanonical: `https://x/${id}`, status: "done", processed: 1 });
  assert.throws(() => validateArticleFixtures([row(1, 1), row(2, 2)], [1, 2, 3]), /missing/);
  assert.throws(() => validateArticleFixtures([{ ...row(1, 1), contentText: " " }, row(2, 2), row(3, 3)], [1, 2, 3]), /text_missing/);
  assert.throws(() => validateArticleFixtures([{ ...row(1, 1), status: "pending" }, row(2, 2), row(3, 3)], [1, 2, 3]), /not_completed/);
  assert.throws(() => validateArticleFixtures([row(1, 1), row(2, 1)], [1, 2]), /2_distinct/);
  assert.equal(validateArticleFixtures([row(1, 1), row(2, 2), row(3, 3)], [1, 2, 3]).length, 3);
});
test("production-negative passes unrelated events and explicitly skips comparison", () => {
  const articles = [1, 2].map((articleId) => ({ articleId, status: "completed" }));
  const result = classifyAcceptanceResult({ mode: "production-negative", articles, match: { status: "single" }, comparison: { status: "SKIPPED_NO_SHARED_EVENT" }, conflicts: [], timeline: { combined: false }, safety: {} });
  assert.equal(result.verdict, "PASS");
});
test("production-negative fails a false merge, false conflict, or combined timeline", () => {
  const base = { mode: "production-negative", articles: [1, 2].map((articleId) => ({ articleId, status: "completed" })), match: { status: "single" }, comparison: { status: "SKIPPED_NO_SHARED_EVENT" }, conflicts: [], timeline: { combined: false }, safety: {} };
  assert.equal(classifyAcceptanceResult({ ...base, match: { status: "matched" } }).reason, "false_cross_article_merge");
  assert.equal(classifyAcceptanceResult({ ...base, conflicts: [{}] }).reason, "cross_event_conflict_created");
  assert.equal(classifyAcceptanceResult({ ...base, timeline: { combined: true } }).reason, "combined_timeline_created");
});
test("synthetic-positive fixture has three sources, distinct wording and shared structured facts", () => {
  assert.equal(SYNTHETIC_POSITIVE_FIXTURES.length, 3);
  assert.equal(new Set(SYNTHETIC_POSITIVE_FIXTURES.map((item) => item.sourceSlug)).size, 3);
  assert.equal(new Set(SYNTHETIC_POSITIVE_FIXTURES.map((item) => item.text)).size, 3);
  for (const item of SYNTHETIC_POSITIVE_FIXTURES) {
    assert.match(item.text, /BKK Zrt\./u); assert.match(item.text, /Zöld Busz Program/u); assert.match(item.text, /2026\. október 20/iu);
    assert.match(item.text, /új buszokat vásárol/iu);
  }
});
test("synthetic-positive raw text produces canonical claims, evidence, events, timeline and a cross-source match", async () => {
  const entityProvider = createDeterministicEntityProvider();
  const claimProvider = createDeterministicClaimProvider();
  const events = [];
  const comparisonRows = [];
  for (const [index, fixture] of SYNTHETIC_POSITIVE_FIXTURES.entries()) {
    const articleId = index + 20; const sourceId = index + 30; const evidenceId = index + 10;
    const entityRaw = await entityProvider.extractEntities({ text: fixture.text });
    const claimRaw = await claimProvider.extractClaims({ text: fixture.text });
    const claims = validateClaimResult({ articleId, sourceId, text: fixture.text }, claimRaw).result.claims;
    assert.ok(claims.length > 0);
    const resolutions = await resolveFixtureEntities(entityRaw.entities);
    assert.equal(resolutions.every((item) => item.result.resolutionStatus === "resolved_exact"), true);
    const bound = bindResolvedClaimEntities({ claims, entities: entityRaw.entities, resolutions });
    assert.deepEqual([bound[0].subjectEntityId, bound[0].objectEntityId], [101, 102]);
    assert.equal(fixture.text.slice(bound[0].evidence.start, bound[0].evidence.end), bound[0].evidence.textSpan);
    const projection = buildEvidenceBackedEventCandidates({
      articleId,
      claims: bound,
      persistedClaims: bound.map((_claim, claimIndex) => ({ claimId: 200 + index * 10 + claimIndex, evidenceId })),
      entities: entityRaw.entities,
      resolutions,
    });
    assert.equal(projection.candidates.length, 1);
    const candidate = runEventMatching(projection.candidates[0], { enabled: true }).candidate;
    const timeline = buildArticleTimelineProjection({ articleId, eventCandidates: [candidate], persistedEvents: [{ eventId: index + 1, articleId }] });
    assert.equal(timeline.items.length, 1);
    events.push({
      ...candidate,
      eventId: index + 1,
      predicate: bound[0].predicate,
      claimStatus: bound[0].status,
      conditional: bound[0].conditional,
      uncertainty: bound[0].uncertainty,
      polarity: bound[0].polarity,
      evidence: [{ evidenceId, articleId, sourceId, sourceKey: fixture.sourceSlug }],
      entities: candidate.entities.map((entity) => ({ ...entity, canonicalEntityId: entity.entityId, status: "accepted" })),
    });
    comparisonRows.push({
      claimId: 200 + index * 10, articleId, sourceId, sourceKey: fixture.sourceSlug, source: fixture.sourceName,
      subjectEntityId: 101, subjectCanonicalId: 101, subjectEntityStatus: "accepted",
      objectEntityId: 102, objectCanonicalId: 102, objectEntityStatus: "accepted",
      predicate: bound[0].predicate, claimType: bound[0].claimType,
      valueJson: JSON.stringify({ value: bound[0].value, polarity: bound[0].polarity, uncertainty: false, conditional: false, modality: bound[0].modality, attributionType: bound[0].attributionType }),
      normalizedValue: bound[0].normalizedValue, validFrom: bound[0].validFrom, validUntil: null, status: "observed",
      publishedAt: "2026-10-20T10:00:00.000Z",
      evidenceJson: JSON.stringify([{ id: evidenceId, articleId, sourceId, textSpan: bound[0].evidence.textSpan, supportType: "support" }]),
    });
  }
  const match = buildCrossArticleEventGroup(events, 1);
  assert.equal(match.status, "matched");
  assert.equal(match.metrics.crossSourceMatches, 2);
  assert.equal(match.authority.independentConfirmation, true);
  assert.deepEqual(match.articleIds, [20, 21, 22]);
  assert.deepEqual(match.sourceIds, [30, 31, 32]);
  const comparison = buildSourceComparison(comparisonRows);
  assert.equal(comparison.status, "ready");
  assert.equal(comparison.metrics.sharedClaims, 1);
});
test("synthetic-positive result passes only with matched provenance-safe local execution", () => {
  const metrics = { entitiesFound: 2, entitiesCanonicallyResolved: 2, canonicalSubjectBindings: 1, canonicalObjectBindings: 1, claimsFound: 1, claimsWithEvidence: 1, eventsFound: 1, timelineItemsFound: 1 };
  const result = classifyAcceptanceResult({
    mode: "synthetic-positive",
    articles: [1, 2, 3].map((articleId) => ({ articleId, status: "completed", metrics })),
    match: { status: "matched", metrics: { crossSourceMatches: 2 } },
    comparison: { status: "ready" },
    conflicts: [],
    safety: { productionWritesExecuted: 0, externalProviderCalls: 0, paidAiCalls: 0, provenanceValid: true, timelineValid: true, conflictValid: true },
  });
  assert.equal(result.verdict, "PASS");
});
test("acceptance provider gate blocks paid or external providers", () => {
  assert.equal(assertAcceptanceProvider("deterministic-semantic"), "deterministic-semantic");
  for (const provider of ["openai", "cloudflare", "mock", "external"]) assert.throws(() => assertAcceptanceProvider(provider), /external_provider_blocked/);
});
test("synthetic-positive verdict is fail-closed for provider use, runtime failure, rejection and incomplete coverage", () => {
  const metrics = { entitiesFound: 2, entitiesCanonicallyResolved: 2, canonicalSubjectBindings: 1, canonicalObjectBindings: 1, claimsFound: 1, claimsWithEvidence: 1, eventsFound: 1, timelineItemsFound: 1 };
  const completed = [1, 2, 3].map((articleId) => ({ articleId, status: "completed", metrics }));
  const matched = { status: "matched", metrics: { crossSourceMatches: 2 } };
  const ready = { status: "ready" };
  assert.equal(classifyAcceptanceResult({ mode: "synthetic-positive", articles: completed, match: matched, comparison: ready, safety: { externalProviderCalls: 1 } }).verdict, "FAIL");
  assert.equal(classifyAcceptanceResult({ articles: [{ status: "failed" }], safety: {} }).category, "SYSTEM ERROR");
  assert.equal(classifyAcceptanceResult({ articles: completed, match: { status: "single", metrics: { matchesRejected: 1 } }, safety: {} }).category, "MATCH REJECTION");
  assert.equal(classifyAcceptanceResult({ articles: completed, match: { status: "candidate", metrics: {} }, safety: {} }).verdict, "PARTIAL");
  assert.equal(classifyAcceptanceResult({ articles: completed, match: matched, comparison: ready, safety: {} }).verdict, "PASS");
});
test("synthetic-positive rejects completed articles with zero claims, evidence, events, or timeline", () => {
  const complete = { entitiesFound: 2, entitiesCanonicallyResolved: 2, canonicalSubjectBindings: 1, canonicalObjectBindings: 1, claimsFound: 1, claimsWithEvidence: 1, eventsFound: 1, timelineItemsFound: 1 };
  for (const missing of ["entitiesCanonicallyResolved", "canonicalSubjectBindings", "canonicalObjectBindings", "claimsFound", "claimsWithEvidence", "eventsFound", "timelineItemsFound"]) {
    const articles = [1, 2, 3].map((articleId) => ({ articleId, status: "completed", metrics: { ...complete } }));
    articles[1].metrics[missing] = 0;
    assert.equal(hasSyntheticSemanticCoverage(articles[1]), false);
    const canonicalMissing = ["entitiesCanonicallyResolved", "canonicalSubjectBindings", "canonicalObjectBindings"].includes(missing);
    assert.deepEqual(classifyAcceptanceResult({ mode: "synthetic-positive", articles, safety: {} }), { verdict: "FAIL", category: "COVERAGE GAP", reason: canonicalMissing ? "canonical_entity_resolution_incomplete" : "semantic_coverage_gap" });
    assert.equal(hasSyntheticCanonicalResolution(articles[1]), !canonicalMissing);
  }
});

test("canonical exact resolution is type-safe, ambiguity-safe, and independent of source order", async () => {
  const provider = createDeterministicEntityProvider();
  const extracted = await Promise.all(SYNTHETIC_POSITIVE_FIXTURES.map((fixture) => provider.extractEntities({ text: fixture.text })));
  const forward = await Promise.all(extracted.map((item) => resolveFixtureEntities(item.entities)));
  const reverse = await Promise.all([...extracted].reverse().map((item) => resolveFixtureEntities(item.entities)));
  for (const results of [...forward, ...reverse]) assert.deepEqual(results.map((item) => item.result.entityId).sort((a, b) => a - b), [101, 102]);

  const wrongType = await resolveEntityMention(canonicalLookupConnection(), { name: "bkk", entityType: "project", language: "hu", confidence: 0.95 });
  assert.equal(wrongType.resolutionStatus, "unresolved");
  const ambiguousRows = [...CANONICAL_ENTITIES, { ...CANONICAL_ENTITIES[0], id: 103 }];
  const ambiguous = await resolveEntityMention(canonicalLookupConnection(ambiguousRows), { name: "bkk", entityType: "organization", language: "hu", confidence: 0.95 });
  assert.equal(ambiguous.resolutionStatus, "ambiguous");
});
test("cleanup policy defaults to drop on success and keep on failure unless explicitly overridden", () => {
  function keep({ success, keepDb = false, dropOnFailure = false }) { return keepDb || (!success && !dropOnFailure); }
  assert.equal(keep({ success: true }), false); assert.equal(keep({ success: false }), true);
  assert.equal(keep({ success: true, keepDb: true }), true); assert.equal(keep({ success: false, dropOnFailure: true }), false);
});
