"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const load = require("../helpers/insights-loader.cjs");
const contract = require("../../lib/v2/read-model-contract");
const { normalizeSourceComparisonResponse } = require("../../lib/v2/source-comparison-client");

test("source comparison API returns HTTP 200 with an empty evidence-safe comparison", async () => {
  const events = [];
  const route = load("app/api/v2/source-comparison/route.ts", {
    "@/lib/db": { db: {} },
    "@/lib/security": { securityCheck: async () => null },
    "@/lib/v2/feature-flags": { isV2Enabled: () => true },
    "@/lib/v2/read-model-contract": contract,
    "@/lib/v2/read-model-repository": {
      compareSources: async () => ({ scope: { type: "claim", id: 7 }, sources: [] }),
      compareSourcesDetailed: async () => ({ status: "empty", sources: [], claims: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 }, metrics: { sourcesCompared: 0, claimsCompared: 0, sharedClaims: 0, sourceOnlyClaims: 0, unmatchedClaims: 0, observationsSkipped: 0 } }),
    },
  }, { Buffer, Promise, console: { info: (line) => events.push(JSON.parse(line)) } });
  const response = await route.GET({ url: "http://local/api/v2/source-comparison?claimId=7&detail=claims" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.claims, []);
  assert.equal(response.body.data.status, "empty");
  assert.deepEqual(events.map((entry) => entry.event), ["v2_source_comparison_started", "v2_source_comparison_skipped"]);
  assert.equal(events[1].externalProviderCalls, 0);
});

test("client excludes malformed observations and preserves explicit coverage states", () => {
  const normalized = normalizeSourceComparisonResponse({ data: {
    status: "ready",
    sources: [{ id: 1, key: "alpha.hu", name: "Alpha", articleCount: 1 }],
    claims: [{ key: "p:1", predicate: "VALUE", claimType: "numeric", subjectEntityId: 2, coverage: "source_only", observations: [
      { source: { id: 1, key: "alpha.hu", name: "Alpha" }, claimIds: [3], articleIds: [4], value: { value: 20, unit: "HUF" }, evidence: [{ id: 5, claimId: 3, articleId: 4, sourceId: 1, textSpan: "20 forint" }] },
      { source: null, evidence: [] },
    ], coverageBySource: [{ source: { id: 1, key: "alpha.hu", name: "Alpha" }, state: "source_only" }] }],
    pagination: { page: 1, pages: 1, total: 1 },
  } });
  assert.equal(normalized.status, "ready");
  assert.equal(normalized.claims[0].observations.length, 1);
  assert.equal(normalized.claims[0].observations[0].evidence[0].textSpan, "20 forint");
  assert.equal(normalized.claims[0].coverageBySource[0].state, "source_only");
});

test("comparison failure is isolated and external providers are absent", async () => {
  const events = [];
  const route = load("app/api/v2/source-comparison/route.ts", {
    "@/lib/db": { db: {} },
    "@/lib/security": { securityCheck: async () => null },
    "@/lib/v2/feature-flags": { isV2Enabled: () => true },
    "@/lib/v2/read-model-contract": contract,
    "@/lib/v2/read-model-repository": { compareSources: async () => { throw new Error("db_failed"); }, compareSourcesDetailed: async () => { throw new Error("db_failed"); } },
  }, { Buffer, Promise, console: { info: (line) => events.push(JSON.parse(line)) } });
  const response = await route.GET({ url: "http://local/api/v2/source-comparison?eventId=8&detail=claims" });
  assert.equal(response.status, 500);
  assert.equal(events.at(-1).event, "v2_source_comparison_failed");
  const engine = fs.readFileSync("lib/v2/source-comparison.js", "utf8");
  const repository = fs.readFileSync("lib/v2/read-model-repository.js", "utf8");
  assert.doesNotMatch(engine, /fetch\(|openai|cloudflare|require\([^)]*provider/i);
  assert.doesNotMatch(repository, /\b(?:INSERT|UPDATE|DELETE)\b/i);
});
