"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { getEntity, getEvent, getClaim, compareSources } = require("../../lib/v2/read-model-repository");

function connection() {
  return { execute: async (sql) => {
    if (/FROM v2_entities WHERE/.test(sql)) return [[{ id: 1, entityType: "person", name: "Ada", status: "active" }], []];
    if (/FROM v2_entity_aliases/.test(sql)) return [[{ name: "A. Lovelace" }, { name: "A. Lovelace" }], []];
    if (/FROM v2_entity_mentions/.test(sql)) return [[{ articleCount: "2", sourceCount: "1" }], []];
    if (/FROM v2_events WHERE/.test(sql)) return [[{ id: 2, status: "candidate", startAt: "2026-01-01T00:00:00.000Z", endAt: null }], []];
    if (/FROM v2_event_entities/.test(sql)) return [[{ id: 1, entityType: "person", name: "Ada" }], []];
    if (/FROM v2_event_articles/.test(sql) && /SELECT DISTINCT a/.test(sql)) return [[{ id: 8, source: " 24.hu ", sourceId: 3, publishedAt: "2026-01-02T00:00:00.000Z" }], []];
    if (/FROM v2_claims/.test(sql)) return [[{ id: 4, claimType: "numeric", valueJson: '{"value":5,"unit":"kg"}', status: "observed", validFrom: null, validUntil: null, subjectId: 1, subjectName: "Ada" }], []];
    if (/FROM v2_claim_evidence/.test(sql)) return [[{ articleId: 8, sourceId: 3, source: "24.hu", publishedAt: "2026-01-02T00:00:00.000Z", excerpt: "validated span" }], []];
    if (/FROM v2_event_articles ea JOIN articles/.test(sql)) return [[{ sourceId: 3, source: "24.hu", articleCount: "2", firstPublishedAt: "2026-01-01T00:00:00.000Z", lastPublishedAt: "2026-01-02T00:00:00.000Z" }], []];
    throw new Error(`unexpected_sql:${sql}`);
  } };
}

test("M13 entity projection allowlists fields, deduplicates aliases and summarizes evidence", async () => {
  const result = await getEntity(connection(), 1, { timeline: false });
  assert.deepEqual(result.aliases, [{ name: "A. Lovelace" }]);
  assert.deepEqual(result.evidenceSummary, { articleCount: 2, sourceCount: 1 });
  assert.equal(result.type, "person");
});

test("M13 event and claim projections keep public semantics", async () => {
  const event = await getEvent(connection(), 2);
  assert.equal(event.status, "candidate");
  assert.deepEqual(event.temporal, { start: "2026-01-01T00:00:00.000Z", end: null });
  const claim = await getClaim(connection(), 4);
  assert.deepEqual(claim.value, { value: 5, unit: "kg" });
  assert.equal(claim.status, "reported");
  assert.equal(claim.evidence[0].excerpt, "validated span");
});

test("M13 source comparison uses one scoped, stable, non-ranking query", async () => {
  const result = await compareSources(connection(), { type: "event", id: 2 });
  assert.deepEqual(result.scope, { type: "event", id: 2 });
  assert.deepEqual(result.sources[0], { id: 3, name: "24.hu", articleCount: 2, firstPublishedAt: "2026-01-01T00:00:00.000Z", lastPublishedAt: "2026-01-02T00:00:00.000Z" });
  await assert.rejects(() => compareSources(connection(), { type: "other", id: 2 }), /scope_type_invalid/);
});

console.log("M13 public read repository regression: PASS");
