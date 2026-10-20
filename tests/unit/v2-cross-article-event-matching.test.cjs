"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyCrossArticleEventMatch, buildCrossArticleEventGroup } = require("../../lib/v2/event-matching");
const { loadCrossArticleEventObservations } = require("../../lib/v2/event-matching-repository");
const { buildSourceComparison } = require("../../lib/v2/source-comparison");
const { detectComparisonConflicts } = require("../../lib/v2/conflict-history");

function event(eventId, overrides = {}) {
  const sourceId = overrides.sourceId || eventId;
  return {
    eventId, eventType: "OPENING_EVENT", status: "candidate",
    startAt: "2026-10-20T08:00:00.000Z", endAt: "2026-10-20T08:00:00.000Z",
    predicate: "OPENING_EVENT", claimStatus: "observed", modality: null, conditional: false, uncertainty: false, polarity: "affirmed",
    evidence: [{ evidenceId: 1000 + eventId, articleId: 100 + eventId, sourceId }],
    entities: [
      { entityId: 10, canonicalEntityId: 10, role: "subject", status: "active" },
      { entityId: 20, canonicalEntityId: 20, role: "project", status: "active" },
      { entityId: 30, canonicalEntityId: 30, role: "location", status: "active" },
    ],
    ...overrides,
  };
}

test("three canonical sources with the same structured event form one deterministic group", () => {
  const events = [event(3), event(1), event(2)];
  const result = buildCrossArticleEventGroup(events, 1);
  assert.equal(result.status, "matched");
  assert.deepEqual(result.eventIds, [1, 2, 3]);
  assert.deepEqual(result.sourceIds, [1, 2, 3]);
  assert.equal(result.metrics.crossSourceMatches, 2);
  assert.equal(result.metrics.externalProviderCalls, 0);
  assert.deepEqual(result, buildCrossArticleEventGroup([...events].reverse(), 1));
  assert.deepEqual(result, buildCrossArticleEventGroup(events, 1));
  assert.deepEqual(result.canonicalTimeline, { eventId: 1, observationEventIds: [1, 2, 3], observationCount: 3 });
});

test("same-source article can match but remains one source identity", () => {
  const result = buildCrossArticleEventGroup([event(1, { sourceId: 7 }), event(2, { sourceId: 7 })], 1);
  assert.deepEqual(result.sourceIds, [7]);
  assert.equal(result.metrics.sameSourceMatches, 1);
  assert.equal(result.metrics.crossSourceMatches, 0);
  assert.equal(result.authority.independentConfirmation, false);
});

test("hard gates reject different type, object, location, time, state and predicate", () => {
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { eventType: "BUS_PURCHASE" })).reason, "event_type");
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { entities: event(2).entities.map((x) => x.role === "project" ? { ...x, entityId: 21, canonicalEntityId: 21 } : x) })).reason, "object_mismatch");
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { entities: event(2).entities.map((x) => x.role === "location" ? { ...x, entityId: 31, canonicalEntityId: 31 } : x) })).reason, "location_mismatch");
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { startAt: "2026-10-21T08:00:00Z", endAt: "2026-10-21T08:00:00Z" })).reason, "temporal_mismatch");
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { modality: "planned" })).reason, "event_state_mismatch");
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { predicate: "BUS_PURCHASE" })).reason, "predicate_mismatch");
});

test("unknown time and missing location proof never auto-match", () => {
  assert.deepEqual(classifyCrossArticleEventMatch(event(1), event(2, { startAt: null, endAt: null })).status, "candidate");
  assert.equal(classifyCrossArticleEventMatch(event(1), event(2, { entities: event(2).entities.filter((x) => x.role !== "location") })).reason, "location_not_proven");
});

test("same entity and day with a different announcement is rejected, while wording is irrelevant", () => {
  const differentProject = event(2, { canonicalTitle: "X új beruházást jelentett be", entities: event(2).entities.map((x) => x.role === "project" ? { ...x, entityId: 99, canonicalEntityId: 99 } : x) });
  assert.equal(classifyCrossArticleEventMatch(event(1, { canonicalTitle: "X gyárat nyit" }), differentProject).status, "rejected");
  assert.equal(classifyCrossArticleEventMatch(event(1, { canonicalTitle: "X új gyár építését jelentette be" }), event(2, { canonicalTitle: "Debrecenben épít üzemet az X vállalat" })).status, "matched");
});

test("same company, city and event type on a different date cannot false-merge", () => {
  const result = classifyCrossArticleEventMatch(event(1), event(2, { startAt: "2026-10-27T08:00:00Z", endAt: "2026-10-27T08:00:00Z" }));
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: "rejected", reason: "temporal_mismatch" });
});

test("matched event observations can feed the existing source comparison and winner-free conflict detector", () => {
  const group = buildCrossArticleEventGroup([event(1), event(2)], 1);
  assert.deepEqual(group.eventIds, [1, 2]);
  const base = {
    claimGroupId: 9, subjectEntityId: 10, subjectCanonicalId: 10, subjectEntityStatus: "active", objectEntityId: 20, objectCanonicalId: 20, objectEntityStatus: "active",
    predicate: "JOB_COUNT", claimType: "numeric", validFrom: "2026-10-20T08:00:00Z", validUntil: "2026-10-21T08:00:00Z", status: "observed",
  };
  const rows = [
    { ...base, claimId: 71, normalizedValue: "500", valueJson: JSON.stringify({ value: { value: 500, unit: "fő" }, polarity: "affirmed", uncertainty: false, conditional: false, modality: "asserted", attributionType: "direct" }), articleId: 101, sourceId: 1, sourceKey: "alpha", source: "Alpha", publishedAt: "2026-10-20T09:00:00Z", evidence: [{ id: 81, articleId: 101, sourceId: 1, textSpan: "500 munkahely" }] },
    { ...base, claimId: 72, normalizedValue: "600", valueJson: JSON.stringify({ value: { value: 600, unit: "fő" }, polarity: "affirmed", uncertainty: false, conditional: false, modality: "asserted", attributionType: "direct" }), articleId: 102, sourceId: 2, sourceKey: "beta", source: "Beta", publishedAt: "2026-10-20T09:05:00Z", evidence: [{ id: 82, articleId: 102, sourceId: 2, textSpan: "600 munkahely" }] },
  ];
  const comparison = buildSourceComparison(rows);
  const conflicts = detectComparisonConflicts(comparison);
  assert.equal(conflicts.conflicts.length, 1);
  assert.equal(conflicts.conflicts[0].automaticWinner, null);
});

test("evidence-free and unresolved events fail closed", () => {
  assert.deepEqual(classifyCrossArticleEventMatch(event(1), event(2, { evidence: [] })), { status: "insufficient_evidence", reason: "evidence_missing", mutation: "none" });
  const unresolved = event(2, { entities: event(2).entities.map((x) => x.role === "subject" ? { ...x, status: "unresolved" } : x) });
  assert.equal(classifyCrossArticleEventMatch(event(1), unresolved).status, "abstain");
  const archived = event(2, { entities: event(2).entities.map((x) => x.role === "subject" ? { ...x, status: "archived" } : x) });
  assert.equal(classifyCrossArticleEventMatch(event(1), archived).status, "abstain");
});

test("two article-local events from the same article cannot merge", () => {
  const duplicateArticle = event(2, { evidence: [{ evidenceId: 1002, articleId: 101, sourceId: 2 }] });
  assert.equal(classifyCrossArticleEventMatch(event(1), duplicateArticle).reason, "same_article_distinct_event");
});

test("repository loader is read-only, evidence-bound and preserves article-local records", async () => {
  const calls = [];
  const connection = { execute: async (sql) => {
    calls.push(sql);
    if (/FROM v2_events anchor/.test(sql)) return [[{ eventId: 1, eventType: "OPENING_EVENT", status: "candidate", startAt: "2026-10-20T08:00:00Z", endAt: "2026-10-20T08:00:00Z" }], []];
    if (/FROM v2_event_articles/.test(sql)) return [[{ eventId: 1, articleId: 101, evidenceId: 1001, sourceId: 1, sourceKey: "alpha", predicate: "OPENING_EVENT", claimStatus: "observed", valueJson: JSON.stringify({ polarity: "affirmed" }) }], []];
    if (/FROM v2_event_entities/.test(sql)) return [[{ eventId: 1, entityId: 10, canonicalEntityId: 10, role: "subject", status: "active" }], []];
    throw new Error("unexpected_sql");
  } };
  const rows = await loadCrossArticleEventObservations(connection, 1);
  assert.equal(rows[0].evidence[0].evidenceId, 1001);
  assert.equal(calls.every((sql) => /^\s*SELECT/i.test(sql)), true);
  assert.match(calls[1], /ce\.id=ea\.evidence_id/);
  assert.match(calls[2], /COALESCE\(e\.canonical_entity_id,e\.id\)/);
});

console.log("V2 cross-article event matching regression: PASS");
