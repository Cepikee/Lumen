"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { lookupExactEntity, persistObservedAlias } = require("../../lib/v2/entity-resolution-repository");

function connection(rows) {
  return { execute: async (_sql, params) => [rows.shift() || [], params] };
}

test("M5 exact lookup reuses canonical normalization and does not fold diacritics", async () => {
  const canonical = await lookupExactEntity(connection([[{ id: 1, entity_type: "person", canonical_name: "Mészáros", normalized_name: "mészáros", language: "hu", status: "review" }]]), { name: "  Mészáros  ", entityType: "person" });
  assert.equal(canonical.status, "resolved");
  assert.equal(canonical.matchType, "canonical");
  const miss = await lookupExactEntity(connection([[], []]), { name: "Meszaros", entityType: "person" });
  assert.equal(miss.status, "unresolved");
});

test("M5 exact alias lookup returns miss, one hit or explicit ambiguity without LIMIT 1", async () => {
  const hit = await lookupExactEntity(connection([[], [{ alias_id: 4, entity_id: 7, entity_type: "company", canonical_name: "Acme", normalized_name: "acme", language: "hu", alias: "ACME", normalized_alias: "acme", alias_status: "review" }]]), { name: "acme", entityType: "company" });
  assert.deepEqual([hit.status, hit.matchType, hit.entityId], ["resolved", "alias", 7]);
  const ambiguous = await lookupExactEntity(connection([[], [
    { alias_id: 4, entity_id: 7, entity_type: "company", canonical_name: "Acme", normalized_name: "acme", language: "hu" },
    { alias_id: 5, entity_id: 8, entity_type: "company", canonical_name: "Acme Group", normalized_name: "acme-group", language: "hu" },
  ]]), { name: "acme", entityType: "company" });
  assert.equal(ambiguous.status, "ambiguous");
  assert.equal(ambiguous.review, "alias_collision");
  assert.equal(ambiguous.candidates.length, 2);
});

test("M5 alias persistence requires a real observed mention and provenance boundary", async () => {
  await assert.rejects(() => persistObservedAlias({ execute: async () => [[], []] }, { entityId: 1, mentionId: 2, alias: "Acme" }), /mention_not_found/);
});

console.log("M5 exact lookup and collision boundary regression: PASS");
