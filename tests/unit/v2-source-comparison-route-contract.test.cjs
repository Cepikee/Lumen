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
    "@/lib/v2/conflict-history": { detectComparisonConflicts: () => ({ status: "empty", conflicts: [], metrics: { candidatesChecked: 0, conflictsFound: 0, numericConflicts: 0, polarityConflicts: 0, statusConflicts: 0, abstentions: 0 }, authority: { winner: null }, ai: { providerCalls: 0 } }) },
    "@/lib/v2/event-matching-repository": { resolveCrossArticleEventGroup: async () => { throw new Error("should_not_run"); } },
    "@/lib/v2/read-model-repository": {
      compareSources: async () => ({ scope: { type: "claim", id: 7 }, sources: [] }),
      compareSourcesDetailed: async () => ({ status: "empty", sources: [], claims: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 }, metrics: { sourcesCompared: 0, claimsCompared: 0, sharedClaims: 0, sourceOnlyClaims: 0, unmatchedClaims: 0, observationsSkipped: 0 } }),
    },
  }, { Buffer, Promise, console: { info: (line) => events.push(JSON.parse(line)) } });
  const response = await route.GET({ url: "http://local/api/v2/source-comparison?claimId=7&detail=claims" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.claims, []);
  assert.equal(response.body.data.status, "empty");
  assert.deepEqual(events.map((entry) => entry.event), ["v2_source_comparison_started", "v2_conflict_detection_started", "v2_conflict_detection_skipped", "v2_source_comparison_skipped"]);
  assert.equal(events[2].externalProviderCalls, 0);
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
    "@/lib/v2/conflict-history": { detectComparisonConflicts: () => { throw new Error("should_not_run"); } },
    "@/lib/v2/event-matching-repository": { resolveCrossArticleEventGroup: async () => ({ eventIds: [8], candidates: [], rejected: [], metrics: { eventsCompared: 0, matchesAccepted: 0, candidatesCreated: 0, matchesRejected: 0, abstentions: 0, crossSourceMatches: 0, sameSourceMatches: 0, externalProviderCalls: 0 } }) },
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

test("event scope expands only to evidence-matched events before comparison and conflict detection", async () => {
  const events = []; let receivedOptions;
  const route = load("app/api/v2/source-comparison/route.ts", {
    "@/lib/db": { db: {} },
    "@/lib/security": { securityCheck: async () => null },
    "@/lib/v2/feature-flags": { isV2Enabled: () => true },
    "@/lib/v2/read-model-contract": contract,
    "@/lib/v2/event-matching-repository": { resolveCrossArticleEventGroup: async () => ({ status: "matched", eventIds: [8, 9], candidates: [{ eventId: 10, reason: "temporal_unknown" }], rejected: [{ eventId: 11, reason: "object_mismatch" }], metrics: { eventsCompared: 3, matchesAccepted: 1, candidatesCreated: 1, matchesRejected: 1, abstentions: 0, crossSourceMatches: 1, sameSourceMatches: 0, externalProviderCalls: 0 } }) },
    "@/lib/v2/conflict-history": { detectComparisonConflicts: () => ({ status: "empty", conflicts: [], metrics: {}, authority: { winner: null }, ai: { providerCalls: 0 } }) },
    "@/lib/v2/read-model-repository": {
      compareSources: async () => { throw new Error("should_not_run"); },
      compareSourcesDetailed: async (_db, _scope, options) => { receivedOptions = options; return { status: "ready", sources: [], claims: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 }, metrics: {} }; },
    },
  }, { Buffer, Promise, console: { info: (line) => events.push(JSON.parse(line)) } });
  const response = await route.GET({ url: "http://local/api/v2/source-comparison?eventId=8&detail=claims" });
  assert.equal(response.status, 200);
  assert.deepEqual(receivedOptions.eventIds, [8, 9]);
  assert.deepEqual(response.body.data.eventMatching.eventIds, [8, 9]);
  assert.equal(events.some((entry) => entry.event === "v2_event_match_candidate"), true);
  assert.equal(events.some((entry) => entry.event === "v2_event_match_rejected"), true);
  assert.equal(events.find((entry) => entry.event === "v2_event_match_completed").externalProviderCalls, 0);
});
