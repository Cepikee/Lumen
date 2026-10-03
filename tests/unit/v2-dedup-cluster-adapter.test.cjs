"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { adaptDedupClusterResult } = require("../../lib/v2/dedup-cluster-adapter");
const { CONTRACT_VERSIONS } = require("../../lib/v2/contract-versions");

test("M3 adapter preserves canonical article identity and retry dedup semantics", () => {
  const first = adaptDedupClusterResult({ articleId: 10, canonicalUrl: "http://WWW.Example.com/story/?utm_source=rss", ingestionOutcome: "inserted", source: "Example" });
  const retry = adaptDedupClusterResult({ articleId: 10, canonicalUrl: "https://example.com/story", ingestionOutcome: "deduplicated", source: "Example" });
  assert.equal(first.contractVersion, CONTRACT_VERSIONS.dedupClusterAdapter);
  assert.equal(first.article.urlIdentity, retry.article.urlIdentity);
  assert.equal(first.dedup.state, "new_article");
  assert.equal(retry.dedup.state, "same_article");
  assert.equal(first.article.source, "example");
});

test("M3 adapter does not infer a duplicate from a different title or source", () => {
  const output = adaptDedupClusterResult({ articleId: 11, canonicalUrl: "https://example.com/second", ingestionOutcome: "inserted", source: "Other" });
  assert.equal(output.dedup.state, "new_article");
  assert.equal(output.cluster, null);
});

test("M3 adapter normalizes cluster membership and related IDs deterministically", () => {
  const output = adaptDedupClusterResult({
    articleId: 42,
    canonicalUrl: "https://example.com/story",
    clusterResult: { clusterId: "7", memberArticleIds: [42, 9, "11", 9, 0, "bad"] },
    relatedArticleIds: [42, 8, "8", 3, null],
  });
  assert.deepEqual(output.cluster, { id: 7, memberArticleIds: [9, 11], sourceOfTruth: "legacy_cluster_assignment" });
  assert.deepEqual(output.relatedArticleIds, [3, 8]);
  assert.ok(Object.isFrozen(output));
  assert.ok(Object.isFrozen(output.cluster));
});

test("M3 adapter rejects malformed identity and keeps unresolved states explicit", () => {
  assert.throws(() => adaptDedupClusterResult({ articleId: 1, canonicalUrl: "not-a-url" }), /invalid_canonical_article_url/);
  assert.throws(() => adaptDedupClusterResult({ articleId: 0, canonicalUrl: "https://example.com/a" }), /invalid_article_id/);
  const output = adaptDedupClusterResult({ articleId: 2, canonicalUrl: "https://example.com/a" });
  assert.equal(output.dedup.state, "unknown");
  assert.equal(output.cluster, null);
  assert.equal(output.relatedArticleIds, null);
});
