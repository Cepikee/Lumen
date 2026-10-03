"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSourceComparison } = require("../../lib/v2/source-comparison");
const { compareSourcesDetailed } = require("../../lib/v2/read-model-repository");

function row(overrides = {}) {
  return {
    claimId: 1, claimGroupId: 10, predicate: "injured", claimType: "numeric",
    valueJson: JSON.stringify({ value: { value: 10, unit: "fő" }, attributionType: "quoted" }),
    validFrom: "2026-01-01T00:00:00.000Z", validUntil: "2026-01-02T00:00:00.000Z", status: "observed",
    articleId: 100, sourceId: 1, source: "Alpha", publishedAt: "2026-01-01T10:00:00.000Z", evidenceCount: 1,
    ...overrides,
  };
}

test("M15 descriptive projection preserves shared/source-only coverage and numeric values", () => {
  const result = buildSourceComparison([
    row(),
    row({ claimId: 2, sourceId: 2, source: "Beta", articleId: 200, publishedAt: "2026-01-01T10:05:00.000Z", valueJson: JSON.stringify({ value: { value: 14, unit: "fő" }, attributionType: "quoted" }) }),
    row({ claimId: 3, claimGroupId: 11, predicate: "location", claimType: "categorical", sourceId: 1, source: "Alpha", articleId: 100, valueJson: JSON.stringify({ value: "Budapest" }) }),
  ]);
  assert.deepEqual(result.sources.map((source) => [source.name, source.articleCount]), [["Alpha", 1], ["Beta", 1]]);
  assert.equal(result.claims[0].coverage, "shared");
  assert.deepEqual(result.claims[0].observations.map((item) => item.values[0]), [{ value: 10, unit: "fő" }, { value: 14, unit: "fő" }]);
  assert.equal(result.claims[1].coverage, "source_only");
  assert.equal(result.authority.winner, null);
  assert.equal(result.authority.trustScore, null);
  assert.equal(result.ai.providerCalls, 0);
});

test("M15 projection is stable, paginated and does not turn temporal non-overlap into conflict", () => {
  const result = buildSourceComparison([
    row({ claimId: 9, claimGroupId: 20, predicate: "status", claimType: "status", validFrom: "2026-01-01T00:00:00.000Z", validUntil: "2026-01-02T00:00:00.000Z", valueJson: JSON.stringify({ value: "open" }) }),
    row({ claimId: 10, claimGroupId: 20, predicate: "status", claimType: "status", validFrom: "2026-01-03T00:00:00.000Z", validUntil: "2026-01-04T00:00:00.000Z", sourceId: 2, source: "Beta", articleId: 201, valueJson: JSON.stringify({ value: "closed" }) }),
    row({ claimId: 11, claimGroupId: 21, predicate: "title", claimType: "text", sourceId: 2, source: "Beta", articleId: 202, valueJson: JSON.stringify({ value: "x" }) }),
  ], { page: 1, limit: 1 });
  assert.deepEqual(result.pagination, { page: 1, limit: 1, total: 2, pages: 2 });
  assert.equal(result.claims.length, 1);
  assert.deepEqual(result.claims[0].observations.map((item) => item.temporal[0].start), ["2026-01-01T00:00:00.000Z", "2026-01-03T00:00:00.000Z"]);
});

test("M15 rejects invalid pagination instead of producing an unbounded query", () => {
  assert.throws(() => buildSourceComparison([], { page: 0 }), /page_invalid/);
  assert.throws(() => buildSourceComparison([], { limit: 101 }), /limit_invalid/);
});

test("M15 repository projection uses one bounded claim query and preserves missing source", async () => {
  const calls = [];
  const connection = { execute: async (sql) => {
    calls.push(sql);
    if (/SELECT id FROM v2_events/.test(sql)) return [[{ id: 5 }], []];
    if (/FROM v2_event_articles/.test(sql)) return [[
      { claimId: 1, claimGroupId: 10, predicate: "x", claimType: "numeric", valueJson: JSON.stringify({ value: 1, unit: "db" }), articleId: 9, sourceId: null, source: " ", publishedAt: "2026-01-01T00:00:00.000Z", evidenceCount: "0" },
    ], []];
    throw new Error(`unexpected_sql:${sql}`);
  } };
  const result = await compareSourcesDetailed(connection, { type: "event", id: 5 }, { page: 1, limit: 10 });
  assert.equal(result.sources[0].name, "Ismeretlen");
  assert.equal(result.sources[0].articleCount, 1);
  assert.equal(calls.filter((sql) => /FROM v2_event_articles/.test(sql)).length, 1);
  assert.match(calls.at(-1), /COUNT\(DISTINCT ce\.id\)/);
});

console.log("M15 source comparison projection regression: PASS");
