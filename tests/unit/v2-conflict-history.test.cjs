"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { detectConflict } = require("../../lib/v2/conflict-history");
const { runConflictDetection } = require("../../lib/v2/runtime-conflict-history");
const { persistConflict, recordConfidenceChange } = require("../../lib/v2/conflict-history-repository");

function claim(overrides = {}) {
  const id = overrides.id ?? 1; const articleId = overrides.articleId ?? id + 10; const sourceId = overrides.sourceId ?? id + 20;
  return { id, subjectEntityId: 7, predicate: "PROJECT_COST", claimType: "numeric", value: { value: 20, unit: "billion HUF" }, normalizedValue: "20", unit: "billion HUF", validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-02-01T00:00:00Z", articleId, sourceId, status: "reported", polarity: "affirmed", conditional: false, uncertainty: false, modality: "asserted", attribution: { type: "direct", entityId: null }, evidence: [{ id: id + 100, claimId: id, articleId, sourceId, textSpan: `evidence ${id}` }], ...overrides };
}

test("same-scope evidence-backed numeric disagreement is symmetric and winner-free", () => {
  const left = claim(); const right = claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 35, unit: "billion HUF" }, normalizedValue: "35" });
  const forward = detectConflict(left, right); const reverse = detectConflict(right, left);
  assert.equal(forward.status, "candidate"); assert.equal(forward.conflictType, "numeric"); assert.equal(forward.reason, "numeric_conflict");
  assert.equal(forward.automaticWinner, null); assert.equal(forward.fingerprint, reverse.fingerprint); assert.equal(forward.evidence.length, 2);
});

test("equal values, different times, missing evidence, same source and unit dimensions never conflict", () => {
  assert.equal(detectConflict(claim(), claim({ id: 2, sourceId: 22, articleId: 12 })).reason, "numeric_ranges_compatible");
  assert.equal(detectConflict(claim(), claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 35, unit: "billion HUF" }, validFrom: "2027-01-01", validUntil: "2027-02-01" })).reason, "temporal_scope_mismatch");
  assert.equal(detectConflict(claim(), claim({ id: 2, sourceId: 22, articleId: 12, evidence: [] })).reason, "evidence_missing");
  assert.equal(detectConflict(claim(), claim({ id: 2, sourceId: 21, articleId: 12, value: { value: 35, unit: "billion HUF" } })).reason, "same_source");
  assert.equal(detectConflict(claim(), claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 35, unit: "percent" } })).reason, "unit_dimension_mismatch");
});

test("range overlap is compatible while a disjoint range is a numeric conflict", () => {
  const range = claim({ value: { kind: "range", from: 300, to: 350, unit: "person" }, unit: "person" });
  assert.equal(detectConflict(range, claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 330, unit: "person" }, unit: "person" })).reason, "numeric_ranges_compatible");
  assert.equal(detectConflict(range, claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 500, unit: "person" }, unit: "person" })).reason, "numeric_conflict");
  assert.equal(detectConflict(claim({ uncertainty: true }), claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 21, unit: "billion HUF" } })).reason, "uncertain_claim");
});

test("explicit opposite polarity conflicts only for the same proposition value", () => {
  const denied = claim({ id: 2, sourceId: 22, articleId: 12, polarity: "negated" });
  assert.equal(detectConflict(claim(), denied).reason, "polarity_conflict");
  assert.equal(detectConflict(claim(), { ...denied, value: { value: 35, unit: "billion HUF" }, normalizedValue: "35" }).reason, "polarity_value_mismatch");
});

test("attribution, modality, conditionality, entity and object boundaries abstain", () => {
  const other = { id: 2, sourceId: 22, articleId: 12, value: { value: 35, unit: "billion HUF" } };
  assert.equal(detectConflict(claim(), claim({ ...other, attribution: { type: "reported", entityId: 99 } })).reason, "attribution_mismatch");
  assert.equal(detectConflict(claim(), claim({ ...other, modality: "planned" })).reason, "modality_mismatch");
  assert.equal(detectConflict(claim(), claim({ ...other, conditional: true })).reason, "conditional_claim");
  assert.equal(detectConflict(claim(), claim({ ...other, subjectEntityStatus: "unresolved" })).reason, "entity_unresolved");
  assert.equal(detectConflict(claim({ objectEntityId: 31 }), claim({ ...other, objectEntityId: 32 })).reason, "object_identity_mismatch");
});

test("feature OFF is side-effect free and malformed input fails closed", () => {
  const input = { left: claim(), right: claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 35, unit: "billion HUF" } }) };
  assert.deepEqual(runConflictDetection(input, { enabled: false }), { status: "disabled", contractVersion: "v2.conflict-history.1", reads: 0, writes: 0, providerCalls: 0, candidate: null });
  assert.equal(runConflictDetection(input, { enabled: true }).candidate.state, "open");
  assert.equal(runConflictDetection({ left: {}, right: {} }, { enabled: true }).status, "invalid_input");
});

test("repository remains caller-transactional and confidence history stays idempotent", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => { calls.push({ sql, params }); if (/INSERT IGNORE INTO v2_conflicts/.test(sql)) return [{ insertId: 31, affectedRows: 1 }]; if (/SELECT id FROM v2_conflicts/.test(sql)) return [[{ id: 31 }], []]; if (/v2_entity_graph_history/.test(sql)) return [{ insertId: 41, affectedRows: 1 }]; if (/v2_confidence_history/.test(sql)) return [{ insertId: 51, affectedRows: 1 }]; throw new Error("unexpected_sql"); } };
  const conflict = detectConflict(claim(), claim({ id: 2, sourceId: 22, articleId: 12, value: { value: 35, unit: "billion HUF" } }));
  assert.equal((await persistConflict(connection, conflict)).conflictId, 31);
  assert.equal((await recordConfidenceChange(connection, { objectType: "claim", objectId: 1, oldConfidence: 0.5, newConfidence: 0.4, reason: "conflict_detection", evidenceDelta: { added: 1 }, operationKey: "a".repeat(64), resolverVersion: "r1" })).historyId, 51);
  assert.equal(calls.some((call) => /COMMIT|ROLLBACK|START TRANSACTION/.test(call.sql)), false);
});

console.log("V2 conflict safety regression: PASS");
