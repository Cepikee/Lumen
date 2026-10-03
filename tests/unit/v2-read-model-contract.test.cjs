"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateReadInput, encodeCursor, parseCursor, projectArticleContext, envelope } = require("../../lib/v2/read-model-contract");

test("M13 read model contract validates bounded IDs, asOf, cursor and limit", () => {
  const cursor = encodeCursor({ orderingKey: "2026-01-01T00:00:00.000Z", id: 4 });
  const valid = validateReadInput({ id: "7", asOf: "2026-01-01T00:00:00Z", limit: 10, cursor });
  assert.equal(valid.status, "valid");
  assert.deepEqual(parseCursor(cursor), { orderingKey: "2026-01-01T00:00:00.000Z", id: 4 });
  assert.equal(validateReadInput({ id: "0" }).status, "invalid");
  assert.equal(validateReadInput({ id: "7", limit: 101 }).status, "invalid");
});

test("M13 projection redacts raw row fields and normalizes nullable dates", () => {
  const item = projectArticleContext({ id: 9, title: null, source: "  24.hu ", category: "", published_at: "bad", secret_prompt: "x" }, { id: 2, text: null });
  assert.deepEqual(item, { id: 9, title: null, source: "24.hu", category: null, publishedAt: null, summary: { id: 2, text: null } });
  assert.equal(Object.prototype.hasOwnProperty.call(item, "secret_prompt"), false);
  assert.equal(envelope({ items: [] }).meta.schemaVersion, "v2.envelope.1");
});

console.log("M13 read model contract regression: PASS");
