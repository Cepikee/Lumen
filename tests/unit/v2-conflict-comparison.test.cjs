"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSourceComparison } = require("../../lib/v2/source-comparison");
const { detectComparisonConflicts } = require("../../lib/v2/conflict-history");

let evidenceId = 5000;
function row(overrides = {}) {
  const base = { claimId: 1, subjectEntityId: 50, subjectCanonicalId: 50, subjectEntityStatus: "active", objectEntityId: null, predicate: "PROJECT_COST", claimType: "numeric", normalizedValue: "20", valueJson: JSON.stringify({ value: { value: 20, unit: "billion HUF" }, polarity: "affirmed", uncertainty: false, conditional: false, modality: "asserted", attributionType: "direct" }), validFrom: "2026-01-01", validUntil: "2026-02-01", status: "observed", articleId: 100, sourceId: 1, sourceKey: "alpha.hu", source: "Alpha", publishedAt: "2026-01-01" };
  const result = { ...base, ...overrides };
  result.evidence = overrides.evidence === undefined ? [{ id: evidenceId++, articleId: result.articleId, sourceId: result.sourceId, textSpan: `evidence ${result.claimId}`, supportType: "support" }] : overrides.evidence;
  return result;
}
function other(overrides = {}) { return row({ claimId: 2, articleId: 200, sourceId: 2, sourceKey: "beta.hu", source: "Beta", normalizedValue: "35", valueJson: JSON.stringify({ value: { value: 35, unit: "billion HUF" }, polarity: "affirmed", uncertainty: false, conditional: false, modality: "asserted", attributionType: "direct" }), ...overrides }); }
function detect(rows) { return detectComparisonConflicts(buildSourceComparison(rows)); }

test("different_observation produces one evidence-backed numeric potential conflict", () => {
  const result = detect([row(), other()]);
  assert.equal(result.status, "ready"); assert.equal(result.conflicts.length, 1); assert.equal(result.conflicts[0].reason, "numeric_conflict");
  assert.equal(result.conflicts[0].evidence.length, 2); assert.equal(result.conflicts[0].automaticWinner, null);
  assert.deepEqual(result.metrics, { candidatesChecked: 1, conflictsFound: 1, numericConflicts: 1, polarityConflicts: 0, statusConflicts: 0, abstentions: 0 });
});

test("shared, source-only and not-covered observations never become conflicts", () => {
  assert.equal(detect([row(), other({ normalizedValue: "20", valueJson: row().valueJson })]).conflicts.length, 0);
  assert.equal(detect([row()]).status, "insufficient_evidence");
  assert.equal(detect([row(), other({ claimId: null, evidence: [] })]).conflicts.length, 0);
});

test("temporal, attribution, unit, conditional and unresolved identity mismatches abstain", () => {
  assert.equal(detect([row(), other({ validFrom: "2027-01-01", validUntil: "2027-02-01" })]).conflicts.length, 0);
  assert.equal(detect([row(), other({ valueJson: JSON.stringify({ value: { value: 35, unit: "billion HUF" }, polarity: "affirmed", modality: "asserted", attributionType: "reported", attributionEntityId: 99 }) })]).conflicts.length, 0);
  assert.equal(detect([row(), other({ valueJson: JSON.stringify({ value: { value: 35, unit: "percent" }, polarity: "affirmed", modality: "asserted", attributionType: "direct" }) })]).conflicts.length, 0);
  assert.equal(detect([row(), other({ valueJson: JSON.stringify({ value: { value: 35, unit: "billion HUF" }, polarity: "affirmed", conditional: true, modality: "asserted", attributionType: "direct" }) })]).conflicts.length, 0);
  assert.equal(detect([row(), other({ subjectEntityStatus: "unresolved" })]).conflicts.length, 0);
});

test("explicit polarity conflict is additive and source-order symmetric", () => {
  const denied = other({ normalizedValue: "20", valueJson: JSON.stringify({ value: { value: 20, unit: "billion HUF" }, polarity: "negated", uncertainty: false, conditional: false, modality: "asserted", attributionType: "direct" }) });
  const forward = detect([row(), denied]); const reverse = detect([denied, row()]);
  assert.equal(forward.conflicts[0].reason, "polarity_conflict"); assert.equal(forward.conflicts[0].fingerprint, reverse.conflicts[0].fingerprint);
});

test("same-source disagreement and missing evidence cannot enter the candidate set", () => {
  assert.equal(detect([row(), other({ sourceId: 1, sourceKey: "alpha.hu", source: "Alpha" })]).conflicts.length, 0);
  assert.equal(detect([row(), other({ evidence: [] })]).conflicts.length, 0);
});

test("range overlap is compatible and disjoint range is conflicting", () => {
  const range = row({ normalizedValue: null, valueJson: JSON.stringify({ value: { kind: "range", from: 300, to: 350, unit: "person" }, polarity: "affirmed", modality: "asserted", attributionType: "direct" }) });
  const inside = other({ normalizedValue: "330", valueJson: JSON.stringify({ value: { value: 330, unit: "person" }, polarity: "affirmed", modality: "asserted", attributionType: "direct" }) });
  const outside = other({ normalizedValue: "500", valueJson: JSON.stringify({ value: { value: 500, unit: "person" }, polarity: "affirmed", modality: "asserted", attributionType: "direct" }) });
  assert.equal(detect([range, inside]).conflicts.length, 0);
  assert.equal(detect([range, outside]).conflicts[0].reason, "numeric_conflict");
});

test("detector is deterministic, source-neutral and has no provider or truth authority", () => {
  const first = detect([row(), other()]); const second = detect([row({ evidence: [{ id: 9001, articleId: 100, sourceId: 1, textSpan: "A" }] }), other({ evidence: [{ id: 9002, articleId: 200, sourceId: 2, textSpan: "B" }] })]);
  assert.equal(first.conflicts[0].reason, second.conflicts[0].reason);
  assert.equal(first.authority.winner, null); assert.equal(first.authority.ranking, false); assert.equal(first.authority.majorityAsTruth, false); assert.equal(first.ai.providerCalls, 0);
});

test("three agreeing sources versus one dissenting source stays source-neutral", () => {
  const rows = [
    row(),
    other({ claimId: 3, articleId: 300, sourceId: 3, sourceKey: "gamma.hu", source: "Gamma", normalizedValue: "20", valueJson: row().valueJson }),
    other({ claimId: 4, articleId: 400, sourceId: 4, sourceKey: "delta.hu", source: "Delta", normalizedValue: "20", valueJson: row().valueJson }),
    other({ claimId: 5, articleId: 500, sourceId: 5, sourceKey: "epsilon.hu", source: "Epsilon" }),
  ];
  const result = detect(rows);
  assert.equal(result.conflicts.length, 3);
  assert.ok(result.conflicts.every((conflict) => conflict.reason === "numeric_conflict"));
  assert.ok(result.conflicts.every((conflict) => conflict.automaticWinner === null));
  assert.deepEqual(result.authority, { winner: null, ranking: false, reliabilityScore: null, majorityAsTruth: false });
});

console.log("V2 source-comparison conflict projection regression: PASS");
