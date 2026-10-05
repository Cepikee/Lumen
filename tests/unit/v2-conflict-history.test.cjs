"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { detectConflict } = require("../../lib/v2/conflict-history");
const { runConflictDetection } = require("../../lib/v2/runtime-conflict-history");
const { persistConflict, recordConfidenceChange } = require("../../lib/v2/conflict-history-repository");

const claim = (overrides = {}) => ({ id: 1, subjectEntityId: 7, predicate: "CASUALTIES", claimType: "numeric", normalizedValue: "10", unit: "person", validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-02-01T00:00:00Z", articleId: 11, sourceId: 12, evidence: [{ evidenceId: 21, sourceId: 12 }], ...overrides });

test("M11 detects same-context numeric contradiction and preserves both evidence/attribution", () => {
  const result = detectConflict(claim(), claim({ id: 2, normalizedValue: "14", attribution: { type: "reported", entityId: 99 }, evidence: [{ evidenceId: 22, sourceId: 13 }] }));
  assert.equal(result.status, "candidate");
  assert.equal(result.conflictType, "numeric");
  assert.equal(result.state, "open");
  assert.equal(result.automaticWinner, null);
  assert.deepEqual(result.claims.map((item) => item.id), [1, 2]);
  assert.equal(result.evidence.length, 2);
  assert.equal(result.attribution[1].attribution.entityId, 99);
  assert.equal(result.fingerprint, detectConflict(claim({ id: 2, normalizedValue: "14" }), claim()).fingerprint);
});

test("M11 avoids false conflicts for equal values, disjoint time, unit mismatch and different entities", () => {
  assert.equal(detectConflict(claim(), claim({ id: 2 })).status, "no_conflict");
  assert.equal(detectConflict(claim(), claim({ id: 2, normalizedValue: "14", validFrom: "2026-02-01T00:00:00Z", validUntil: "2026-03-01T00:00:00Z" })).reason, "temporal_non_overlap");
  assert.equal(detectConflict(claim(), claim({ id: 2, normalizedValue: "14", unit: "million_person" })).reason, "unit_mismatch");
  assert.equal(detectConflict(claim({ normalizedValue: "1", unit: "km" }), claim({ id: 2, normalizedValue: "1000", unit: "m" })).reason, "unit_conversion_equal");
  assert.equal(detectConflict(claim({ normalizedValue: "10", unit: "million HUF" }), claim({ id: 2, normalizedValue: "0.01", unit: "billion HUF" })).reason, "unit_conversion_equal");
  assert.equal(detectConflict(claim({ normalizedValue: null, value: { amount: 1, unit: "km" }, unit: "km" }), claim({ id: 2, normalizedValue: null, value: { amount: 1000, unit: "m" }, unit: "m" })).reason, "unit_conversion_equal");
  assert.equal(detectConflict(claim(), claim({ id: 2, normalizedValue: "14", subjectEntityId: 8 })).reason, "scope_or_type_mismatch");
});

test("M11 keeps plan and completed states separate even with the same predicate", () => {
  const planned = claim({ modality: "plan", normalizedValue: "start" });
  const completed = claim({ id: 2, modality: "completed", normalizedValue: "done" });
  assert.equal(detectConflict(planned, completed).reason, "different_event_state");
});

test("M11 handles boolean and categorical contradictions without selecting a winner", () => {
  assert.equal(detectConflict(claim({ claimType: "boolean", normalizedValue: "true" }), claim({ id: 2, claimType: "boolean", normalizedValue: "false" })).conflictType, "categorical");
  assert.equal(detectConflict(claim({ claimType: "categorical", normalizedValue: "open" }), claim({ id: 2, claimType: "categorical", normalizedValue: "closed" })).status, "candidate");
  assert.equal(detectConflict(claim({ claimType: "text", normalizedValue: "a" }), claim({ id: 2, claimType: "text", normalizedValue: "b" })).reason, "scope_or_type_mismatch");
});

test("M11 feature OFF is side-effect free and ON is deterministic", () => {
  const input = { left: claim(), right: claim({ id: 2, normalizedValue: "14" }) };
  assert.deepEqual(runConflictDetection(input, { enabled: false }), { status: "disabled", contractVersion: "v2.conflict-history.1", reads: 0, writes: 0, providerCalls: 0, candidate: null });
  assert.equal(runConflictDetection(input, { enabled: true }).candidate.state, "open");
});

test("M11 repository is caller-transactional and confidence history is idempotent", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/INSERT IGNORE INTO v2_conflicts/.test(sql)) return [{ insertId: 31, affectedRows: 1 }];
    if (/SELECT id FROM v2_conflicts/.test(sql)) return [[{ id: 31 }], []];
    if (/v2_entity_graph_history/.test(sql)) return [{ insertId: 41, affectedRows: 1 }];
    if (/v2_confidence_history/.test(sql)) return [{ insertId: 51, affectedRows: 1 }];
    throw new Error("unexpected_sql");
  } };
  const conflict = detectConflict(claim(), claim({ id: 2, normalizedValue: "14" }));
  assert.equal((await persistConflict(connection, conflict)).conflictId, 31);
  assert.equal((await recordConfidenceChange(connection, { objectType: "claim", objectId: 1, oldConfidence: 0.5, newConfidence: 0.4, reason: "conflict_detection", evidenceDelta: { added: 1 }, operationKey: "a".repeat(64), resolverVersion: "r1" })).historyId, 51);
  assert.equal(calls.some((call) => /COMMIT|ROLLBACK|START TRANSACTION/.test(call.sql)), false);
  await assert.rejects(() => recordConfidenceChange(connection, { objectType: "claim", objectId: 1, oldConfidence: 0.5, newConfidence: 2, reason: "bad" }), /new_confidence_invalid/);
});

console.log("M11 conflict/confidence history regression: PASS");
