"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { RELATION_PREDICATES, validateRelationResult } = require("../../lib/v2/relation-extraction");
const { createMockRelationProvider } = require("../../lib/v2/relation-extraction-provider");
const { runRelationExtraction } = require("../../lib/v2/runtime-relation-extraction");
const { evidenceHash, persistRelationWithEvidence, relationIdempotencyKey } = require("../../lib/v2/relation-extraction-repository");

const input = { articleId: 11, sourceId: 4, extractionRunId: 8, text: "Mészáros works for Acme." };
const relation = { subjectEntityId: 1, predicate: "WORKS_FOR", objectEntityId: 2, confidence: 0.91, evidence: { start: 0, end: 23, textSpan: "Mészáros works for Acme" }, supportType: "support" };

test("M7 uses only the frozen predicate vocabulary and validates evidence spans", () => {
  assert.equal(RELATION_PREDICATES.includes("WORKS_FOR"), true);
  const valid = validateRelationResult(input, { relations: [relation] });
  assert.equal(valid.status, "valid");
  const invalid = validateRelationResult(input, { relations: [{ ...relation, predicate: "MADE_UP" }] });
  assert.equal(invalid.status, "invalid");
  assert.match(invalid.errors.join(" "), /predicate_invalid/);
  const spanInvalid = validateRelationResult(input, { relations: [{ ...relation, evidence: { ...relation.evidence, textSpan: "wrong" } }] });
  assert.match(spanInvalid.errors.join(" "), /evidence_span_mismatch/);
});

test("M7 rejects malformed, unresolved-shaped and unsupported relation input", () => {
  assert.equal(validateRelationResult(input, { relations: [{ ...relation, subjectEntityId: null }] }).status, "invalid");
  assert.equal(validateRelationResult(input, { relations: [{ ...relation, supportType: "fact" }] }).status, "invalid");
  assert.equal(validateRelationResult({ ...input, text: "" }, { relations: [] }).status, "invalid");
});

test("M7 feature OFF performs zero provider calls and ON validates mock output", async () => {
  let calls = 0;
  const provider = createMockRelationProvider({ resultFactory: async () => { calls += 1; return { relations: [] }; } });
  const off = await runRelationExtraction(input, {}, { enabled: false, provider });
  assert.equal(off.status, "disabled");
  assert.equal(off.providerCalls, 0);
  assert.equal(calls, 0);
  const on = await runRelationExtraction(input, {}, { enabled: true, provider });
  assert.equal(on.status, "completed");
  assert.equal(on.providerCalls, 1);
  assert.deepEqual(on.result.relations, []);
});

test("M7 relation persistence has stable identity and evidence identity", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/SELECT id,status FROM v2_entities/.test(sql)) return [[{ id: 1, status: "active" }, { id: 2, status: "active" }]];
    if (/v2_entity_relations/.test(sql)) return [{ insertId: 22, affectedRows: 1 }];
    if (/v2_relation_evidence/.test(sql)) return [{ insertId: 33, affectedRows: 1 }];
    throw new Error("unexpected_sql");
  } };
  const result = await persistRelationWithEvidence(connection, { relation, articleId: 11, sourceId: 4, extractionRunId: 8 });
  assert.deepEqual([result.relationId, result.evidenceId], [22, 33]);
  assert.equal(relationIdempotencyKey(relation), relationIdempotencyKey({ ...relation }));
  assert.equal(evidenceHash({ articleId: 11, sourceId: 4, evidence: relation.evidence }), evidenceHash({ articleId: 11, sourceId: 4, evidence: relation.evidence }));
  assert.equal(calls.filter((call) => /v2_entity_relations/.test(call.sql)).length, 1);
  assert.equal(calls.filter((call) => /v2_relation_evidence/.test(call.sql)).length, 1);
});

test("M7 canonical relation cannot persist without two non-archived entities", async () => {
  const connection = { execute: async (sql) => {
    if (/SELECT id,status FROM v2_entities/.test(sql)) return [[{ id: 1, status: "active" }]];
    throw new Error("relation write must not start");
  } };
  await assert.rejects(() => persistRelationWithEvidence(connection, { relation, articleId: 11 }), /resolved_entities_required/);
});

console.log("M7 relation/evidence contract regression: PASS");
