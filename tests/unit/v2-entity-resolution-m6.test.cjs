"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { boundedDisambiguation, rankCandidates } = require("../../lib/v2/entity-resolution-candidates");
const { resolveEntityMention, findEntityCandidates, persistEntityResolution } = require("../../lib/v2/entity-resolution-repository");
const { runEntityResolution, runEntityResolutionBatch } = require("../../lib/v2/runtime-entity-resolution");

test("M6 same-name candidates remain ambiguous and type mismatch is excluded", () => {
  const result = rankCandidates({ name: "Nagy Péter", entityType: "person", language: "hu" }, [
    { entityId: 2, entity_type: "person", normalized_name: "nagy péter", language: "hu", normalized_alias: "nagy péter" },
    { entityId: 1, entity_type: "person", normalized_name: "péter nagy", language: "hu", normalized_alias: "nagy péter" },
    { entityId: 3, entity_type: "company", normalized_name: "nagy péter", language: "hu" },
  ]);
  assert.equal(result.status, "ambiguous");
  assert.equal(result.selectedEntityId, null);
  assert.deepEqual(result.candidates.map((candidate) => candidate.entityId), [1, 2]);
});

test("M6 candidate scoring is bounded and deterministic", () => {
  const candidates = Array.from({ length: 30 }, (_, index) => ({ entityId: index + 1, entity_type: "company", normalized_name: `acme ${index}`, language: "hu" }));
  const result = rankCandidates({ name: "acme", entityType: "company", language: "hu" }, candidates);
  assert.equal(result.candidates.length, 20);
  assert.deepEqual(result.candidates.map((candidate) => candidate.entityId), Array.from({ length: 20 }, (_, index) => index + 1));
});

test("M6 exact M5 resolution short-circuits candidate generation", async () => {
  let calls = 0;
  const connection = { execute: async (sql) => {
    calls += 1;
    if (/FROM v2_entities/.test(sql) && /normalized_name/.test(sql) && !/LEFT JOIN/.test(sql)) return [[{ id: 9, entity_type: "person", canonical_name: "Nagy Péter", normalized_name: "nagy péter", language: "hu", status: "active" }]];
    throw new Error(`unexpected_sql_${sql}`);
  } };
  const result = await resolveEntityMention(connection, { name: "Nagy Péter", entityType: "person", confidence: 0.99 });
  assert.equal(result.resolutionStatus, "resolved_exact");
  assert.equal(result.method, "exact_canonical");
  assert.equal(result.providerCalls, 0);
  assert.equal(calls, 1);
});

test("M6 feature OFF performs no repository call", async () => {
  let calls = 0;
  const result = await runEntityResolution({ execute: async () => { calls += 1; } }, { name: "Acme", entityType: "company" }, { enabled: false });
  assert.equal(result.status, "disabled");
  assert.equal(result.repositoryCalls, 0);
  assert.equal(calls, 0);
});

test("M6 feature ON runs the canonical M5-to-M6 chain once", async () => {
  const connection = { execute: async (sql) => {
    if (/FROM v2_entities/.test(sql) && !/LEFT JOIN/.test(sql)) return [[{ id: 8, entity_type: "company", canonical_name: "Acme", normalized_name: "acme", language: "hu", status: "active" }]];
    throw new Error("advanced path should not run after exact hit");
  } };
  const result = await runEntityResolution(connection, { name: "Acme", entityType: "company", confidence: 0.99 }, { enabled: true });
  assert.equal(result.status, "resolved_exact");
  assert.equal(result.repositoryCalls, 1);
});

test("M6 feature ON batch preserves the M4 extraction-to-resolution chain", async () => {
  let calls = 0;
  const connection = { execute: async (sql) => {
    calls += 1;
    if (/FROM v2_entities/.test(sql) && !/LEFT JOIN/.test(sql)) return [[{ id: 8, entity_type: "company", canonical_name: "Acme", normalized_name: "acme", language: "hu", status: "active" }]];
    throw new Error("advanced path should not run after exact hit");
  } };
  const result = await runEntityResolutionBatch(connection, { result: { entities: [{ mentionText: "Acme", normalizedCandidateName: "Acme", entityType: "company", confidence: 0.99 }] } }, { enabled: true });
  assert.equal(result.status, "completed");
  assert.equal(result.results[0].status, "resolved_exact");
  assert.equal(calls, 1);
});

test("M6 bounded semantic escalation validates candidate membership and stays review-only", async () => {
  const base = rankCandidates({ name: "Nagy Péter", entityType: "person", language: "hu" }, [
    { entityId: 1, entity_type: "person", normalized_name: "nagy péter", language: "hu", normalized_alias: "nagy péter" },
    { entityId: 2, entity_type: "person", normalized_name: "péter nagy", language: "hu", normalized_alias: "nagy péter" },
  ]);
  const result = await boundedDisambiguation(base, { resolver: async (input) => {
    assert.deepEqual(input.candidateIds, [1, 2]);
    return { entityId: 2, confidence: 0.99 };
  }, context: { articleId: 4, sourceId: 9, location: "Budapest" } });
  assert.equal(result.aiStatus, "review_recommendation");
  assert.equal(result.selectedEntityId, 2);
  assert.equal(result.resolutionStatus, "review");
  const invalid = await boundedDisambiguation(base, { resolver: async () => ({ entityId: 99, confidence: 1 }) });
  assert.equal(invalid.aiStatus, "invalid_output");
});

test("M6 candidate repository enforces the canonical bound", async () => {
  const connection = { execute: async (_sql, params) => {
    assert.equal(params.at(-1), 20);
    return [[{ entity_id: 4, entity_type: "company", normalized_name: "acme", language: "hu", status: "review" }]];
  } };
  const rows = await findEntityCandidates(connection, { name: "Acme", entityType: "company" });
  assert.equal(rows[0].entityId, 4);
  await assert.rejects(() => findEntityCandidates(connection, { name: "Acme", entityType: "company", limit: 21 }), /candidate_limit_invalid/);
});

test("M6 resolved persistence is idempotent and records a history boundary", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/SELECT id,entity_id/.test(sql)) return [[{ id: 5, entity_id: null, confidence: null, resolution_status: "unresolved" }]];
    if (/INSERT INTO v2_entity_graph_history/.test(sql)) return [{ affectedRows: 1 }];
    return [{ affectedRows: 1 }];
  } };
  const result = await persistEntityResolution(connection, { mentionId: 5, result: { resolutionStatus: "resolved_exact", entityId: 7, confidence: 0.99, method: "exact_canonical", resolverVersion: "v2.resolver.1", evidence: {} } });
  assert.equal(result.entityId, 7);
  assert.equal(calls.filter((call) => /INSERT INTO v2_entity_graph_history/.test(call.sql)).length, 1);
  assert.equal(calls.filter((call) => /v2_confidence_history/.test(call.sql)).length, 1);
});

test("M6 review candidates cannot be persisted as automatic entity links", async () => {
  await assert.rejects(() => persistEntityResolution({ execute: async () => { throw new Error("must not query"); } }, {
    mentionId: 1,
    result: { resolutionStatus: "review", selectedEntityId: 2, confidence: 0.99, method: "semantic_review" },
  }), /resolution_not_persistable/);
});

console.log("M6 entity-resolution candidate, short-circuit and persistence regression: PASS");
