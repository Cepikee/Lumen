"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeRelatedSource, selectRelatedCandidates, withinRelatedWindow } = require("../../lib/related-news");

test("related source normalization is consistent", () => {
  assert.equal(normalizeRelatedSource(" 24.hu "), "24.hu");
  assert.equal(normalizeRelatedSource("24hu"), "24.hu");
  assert.equal(normalizeRelatedSource(null), "");
});

test("related news excludes self and duplicate articles and prioritizes cluster", () => {
  const current = { summaryId: 10, articleId: 100, clusterId: 7, source: "24.hu", createdAt: "2026-09-20T12:00:00Z" };
  const candidates = [
    { summaryId: 10, articleId: 100, clusterId: 7, source: "24.hu", createdAt: "2026-09-20T12:00:00Z" },
    { summaryId: 11, articleId: 101, clusterId: null, source: "24hu", createdAt: "2026-09-21T12:00:00Z" },
    { summaryId: 12, articleId: 101, clusterId: 7, source: "other", createdAt: "2026-09-22T12:00:00Z" },
    { summaryId: 13, articleId: 102, clusterId: 7, source: "other", createdAt: "2026-09-19T12:00:00Z" },
  ];
  const result = selectRelatedCandidates(current, candidates, 5);
  assert.deepEqual(result.map((item) => item.articleId), [102, 101]);
});

test("related news applies a symmetric seven-day window", () => {
  assert.equal(withinRelatedWindow("2026-09-27T00:00:00Z", "2026-09-20T00:00:00Z"), true);
  assert.equal(withinRelatedWindow("2026-09-27T00:00:01Z", "2026-09-20T00:00:00Z"), false);
});
