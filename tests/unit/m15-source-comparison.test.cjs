"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSourceComparison } = require("../../lib/v2/source-comparison");
const { compareSourcesDetailed } = require("../../lib/v2/read-model-repository");

let evidenceId = 1000;
function row(overrides = {}) {
  const base = {
    claimId: 1, claimGroupId: 10, subjectEntityId: 50, subjectCanonicalId: 50, subjectEntityStatus: "active", objectEntityId: null,
    predicate: "INJURED", claimType: "numeric", normalizedValue: "10",
    valueJson: JSON.stringify({ value: { value: 10, unit: "fő" }, polarity: "affirmed", uncertainty: false, conditional: false, attributionType: "direct" }),
    validFrom: "2026-01-01T00:00:00.000Z", validUntil: "2026-01-02T00:00:00.000Z", status: "observed",
    articleId: 100, sourceId: 1, sourceKey: "alpha.hu", source: "Alpha", publishedAt: "2026-01-01T10:00:00.000Z",
  };
  const result = { ...base, ...overrides };
  result.evidence = overrides.evidence === undefined ? [{ id: evidenceId++, articleId: result.articleId, sourceId: result.sourceId, textSpan: `${result.predicate} evidence`, supportType: "support" }] : overrides.evidence;
  return result;
}

test("identical semantic claims from two canonical sources are shared with evidence", () => {
  const result = buildSourceComparison([row(), row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta" })]);
  assert.equal(result.status, "ready");
  assert.equal(result.claims.length, 1);
  assert.equal(result.claims[0].coverage, "shared");
  assert.equal(result.claims[0].observations.length, 2);
  assert.equal(result.claims[0].observations.every((item) => item.evidence.length === 1), true);
  assert.deepEqual(result.metrics, { sourcesCompared: 2, claimsCompared: 1, sharedClaims: 1, sourceOnlyClaims: 0, unmatchedClaims: 0, observationsSkipped: 0 });
});

test("numeric value or unit mismatch creates different neutral source-only observations", () => {
  const result = buildSourceComparison([
    row(),
    row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta", normalizedValue: "20000000000", valueJson: JSON.stringify({ value: { value: 20, unit: "milliárd HUF" }, polarity: "affirmed", attributionType: "direct" }) }),
  ]);
  assert.equal(result.claims.length, 2);
  assert.equal(result.claims.every((claim) => claim.coverage === "source_only"), true);
  assert.equal(result.claims.every((claim) => claim.coverageBySource.some((entry) => entry.state === "different_observation")), true);
  assert.equal(result.authority.conflictClassification, false);
  assert.equal(result.authority.winner, null);
});

test("different temporal scopes are not an identical shared proposition", () => {
  const result = buildSourceComparison([row(), row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta", validFrom: "2026-02-01T00:00:00.000Z", validUntil: "2026-02-02T00:00:00.000Z" })]);
  assert.equal(result.claims.length, 2);
  assert.equal(result.claims.every((claim) => claim.coverage === "source_only"), true);
});

test("an event source without the proposition is not-covered, never denial", () => {
  const result = buildSourceComparison([row(), row({ claimId: null, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta", evidence: [] })]);
  assert.equal(result.claims[0].coverage, "source_only");
  assert.equal(result.claims[0].coverageBySource.find((entry) => entry.source.key === "beta.hu").state, "not_covered");
  assert.equal(result.authority.conflictClassification, false);
});

test("same-source duplicate articles remain one source observation", () => {
  const result = buildSourceComparison([row(), row({ claimId: 2, articleId: 101 }), row({ claimId: 3, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta" })]);
  assert.equal(result.claims.length, 1);
  assert.equal(result.claims[0].observations.length, 2);
  assert.deepEqual(result.claims[0].observations.find((item) => item.source.key === "alpha.hu").articleIds, [100, 101]);
  assert.equal(result.sources.find((source) => source.key === "alpha.hu").articleCount, 2);
});

test("source ordering cannot change semantic output", () => {
  const a = row(); const b = row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta" });
  assert.deepEqual(buildSourceComparison([a, b]), buildSourceComparison([b, a]));
});

test("missing evidence, unresolved entities, malformed observations and noncanonical sources abstain", () => {
  const result = buildSourceComparison([
    row({ evidence: [] }),
    row({ claimId: 2, subjectEntityStatus: "unresolved" }),
    row({ claimId: "bad" }),
    row({ claimId: 3, sourceId: null, sourceKey: "", source: "Unknown" }),
  ]);
  assert.deepEqual(result.sources.map((source) => source.key), ["alpha.hu"]);
  assert.deepEqual(result.claims, []);
  assert.equal(result.metrics.observationsSkipped, 4);
});

test("ambiguous same-name entities cannot match without one canonical entity identity", () => {
  const result = buildSourceComparison([row(), row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta", subjectEntityId: 51, subjectCanonicalId: 51 })]);
  assert.equal(result.claims.length, 2);
  assert.equal(result.claims.every((claim) => claim.coverage === "source_only"), true);
});

test("single-source data is explicitly insufficient and never ranked", () => {
  const result = buildSourceComparison([row()]);
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.authority.ranking, false);
  assert.equal(result.authority.trustScore, null);
  assert.equal(result.ai.providerCalls, 0);
});

test("empty input and invalid pagination are safe", () => {
  const empty = buildSourceComparison([]);
  assert.equal(empty.status, "insufficient_evidence");
  assert.deepEqual(empty.claims, []);
  assert.equal(empty.pagination.pages, 0);
  assert.throws(() => buildSourceComparison([], { page: 0 }), /page_invalid/);
  assert.throws(() => buildSourceComparison([], { limit: 101 }), /limit_invalid/);
});

test("repository event scope reads only membership evidence claims and preserves uncovered sources", async () => {
  const calls = [];
  const connection = { execute: async (sql) => {
    calls.push(sql);
    if (/SELECT id FROM v2_events/.test(sql)) return [[{ id: 5 }], []];
    if (/FROM v2_event_articles/.test(sql)) return [[row(), row({ claimId: null, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta", evidence: [] })], []];
    throw new Error(`unexpected_sql:${sql}`);
  } };
  const result = await compareSourcesDetailed(connection, { type: "event", id: 5 }, { page: 1, limit: 10 });
  assert.equal(result.sources.length, 2);
  assert.equal(result.claims[0].coverageBySource.find((item) => item.source.key === "beta.hu").state, "not_covered");
  assert.match(calls.at(-1), /ce\.id=ea\.evidence_id/);
  assert.doesNotMatch(calls.at(-1), /JOIN v2_claims c ON c\.article_id=a\.id/);
});

test("repository claim scope requires canonical sources, resolved entities and exact evidence", async () => {
  const calls = [];
  const connection = { execute: async (sql) => {
    calls.push(sql);
    if (/SELECT id,claim_group_id/.test(sql)) return [[{ id: 1, claimGroupId: 10 }], []];
    if (/FROM v2_claims c/.test(sql)) return [[row(), row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta" })], []];
    throw new Error(`unexpected_sql:${sql}`);
  } };
  const result = await compareSourcesDetailed(connection, { type: "claim", id: 1 });
  assert.equal(result.claims[0].coverage, "shared");
  assert.match(calls.at(-1), /JOIN v2_claim_evidence ce/);
  assert.match(calls.at(-1), /JOIN sources s/);
  assert.match(calls.at(-1), /se\.status<>'unresolved'/);
});

console.log("M15 source comparison projection regression: PASS");
