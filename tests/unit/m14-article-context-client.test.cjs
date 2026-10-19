"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeArticleContextResponse } = require("../../lib/v2/article-context-client");

test("M14 normalizes malformed/null context payloads into a safe stable shape", () => {
  const result = normalizeArticleContextResponse({ data: { article: { id: "7", title: null, source: "24.hu", summary: null }, timeline: { items: [{ type: "event", id: "9", displayAt: "bad" }, null] }, asOf: null } });
  assert.deepEqual(result.article, { id: 7, title: null, source: "24.hu", category: null, publishedAt: null, summary: null });
  assert.deepEqual(result.timeline.items, [{ type: "event", id: 9, validAt: null, displayAt: "bad", timePrecision: null, label: null, status: null }]);
  assert.throws(() => normalizeArticleContextResponse({ data: { article: null } }), /v2_context_article_invalid/);
});

test("M14 preserves the evidence-backed article timeline presentation contract", () => {
  const result = normalizeArticleContextResponse({ data: { article: { id: 7 }, timeline: { items: [{ eventId: 61, eventType: "bus_purchase", time: null, timePrecision: "year", label: "Buszvásárlás", status: "candidate" }], nextCursor: "next" } } });
  assert.deepEqual(result.timeline.items, [{ type: "bus_purchase", id: 61, validAt: null, displayAt: null, timePrecision: "year", label: "Buszvásárlás", status: "candidate" }]);
  assert.equal(result.timeline.nextCursor, "next");
});

console.log("M14 article context client regression: PASS");
