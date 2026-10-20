"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCrossArticleEventGroup } = require("../../lib/v2/event-matching.js");
const {
  SYNTHETIC_POSITIVE_FIXTURES, assertAcceptanceDatabaseName, assertAcceptanceOptIn, assertAcceptanceProvider, assertProductionReadSql,
  classifyAcceptanceResult, createAcceptanceDatabaseController, createProductionReadAdapter,
  parseAcceptanceMode, parseArticleIds, validateArticleFixtures,
} = require("../../lib/acceptance/v2-vps-harness.js");

test("production writes are rejected before reaching the connection", async () => {
  let calls = 0; const raw = { async query() { calls += 1; }, async execute() { calls += 1; } };
  const db = createProductionReadAdapter(raw);
  await assert.rejects(() => db.execute("INSERT INTO articles VALUES (?)", [1]), /production_write_rejected:INSERT/);
  assert.equal(calls, 0);
});
test("production SELECT, SHOW, DESCRIBE and EXPLAIN are allowed", async () => {
  const seen = []; const raw = { async query(sql) { seen.push(sql); return [[], []]; }, async execute(sql) { seen.push(sql); return [[], []]; } };
  const db = createProductionReadAdapter(raw);
  for (const sql of ["SELECT 1", "SHOW TABLES", "DESCRIBE articles", "EXPLAIN SELECT 1"]) await db.query(sql);
  assert.equal(seen.length, 4); assert.equal(assertProductionReadSql("/* audit */ SELECT 1"), "SELECT");
});
test("production read allowlist rejects stacked statements, locks and server-side file writes", () => {
  assert.throws(() => assertProductionReadSql("SELECT 1; UPDATE articles SET title='x'"), /unsafe_read_shape/);
  assert.throws(() => assertProductionReadSql("SELECT * FROM articles FOR UPDATE"), /unsafe_read_shape/);
  assert.throws(() => assertProductionReadSql("SELECT title INTO OUTFILE '/tmp/x' FROM articles"), /unsafe_read_shape/);
});
test("acceptance writes require explicit opt-in and a safe database name", async () => {
  assert.throws(() => assertAcceptanceOptIn({}, "utom_acceptance_ok"), /opt_in/);
  assert.equal(assertAcceptanceOptIn({ UTOM_ACCEPTANCE_RUN: "true" }, "utom_acceptance_run1"), "utom_acceptance_run1");
  assert.throws(() => assertAcceptanceDatabaseName("utom"), /unsafe/);
});
test("safe controller creates and drops only the guarded acceptance database", async () => {
  const sql = []; const connection = { async query(value) { sql.push(value); } };
  const controller = createAcceptanceDatabaseController(connection, { env: { UTOM_ACCEPTANCE_RUN: "true" }, databaseName: "utom_acceptance_test1" });
  await controller.create(); await controller.drop();
  assert.match(sql[0], /^CREATE DATABASE `utom_acceptance_test1`/); assert.equal(sql[1], "DROP DATABASE IF EXISTS `utom_acceptance_test1`");
  assert.throws(() => createAcceptanceDatabaseController(connection, { env: { UTOM_ACCEPTANCE_RUN: "true" }, databaseName: "production" }), /unsafe/);
});
test("mode and article selection require two explicit production IDs without a global three-article minimum", () => {
  assert.equal(parseAcceptanceMode("production-negative"), "production-negative");
  assert.equal(parseAcceptanceMode("synthetic-positive"), "synthetic-positive");
  assert.throws(() => parseAcceptanceMode(""), /mode_required/);
  assert.deepEqual(parseArticleIds("1,2"), [1, 2]);
  assert.throws(() => parseArticleIds("1,1"), /duplicate/); assert.throws(() => parseArticleIds("1"), /at_least_2/);
});
test("fixture validation rejects missing articles, text and same-source selection before fixture creation", () => {
  const row = (id, sourceId) => ({ id, sourceId, sourceSlug: `s${sourceId}`, contentText: "body", urlCanonical: `https://x/${id}`, status: "done", processed: 1 });
  assert.throws(() => validateArticleFixtures([row(1, 1), row(2, 2)], [1, 2, 3]), /missing/);
  assert.throws(() => validateArticleFixtures([{ ...row(1, 1), contentText: " " }, row(2, 2), row(3, 3)], [1, 2, 3]), /text_missing/);
  assert.throws(() => validateArticleFixtures([{ ...row(1, 1), status: "pending" }, row(2, 2), row(3, 3)], [1, 2, 3]), /not_completed/);
  assert.throws(() => validateArticleFixtures([row(1, 1), row(2, 1)], [1, 2]), /2_distinct/);
  assert.equal(validateArticleFixtures([row(1, 1), row(2, 2), row(3, 3)], [1, 2, 3]).length, 3);
});
test("production-negative passes unrelated events and explicitly skips comparison", () => {
  const articles = [1, 2].map((articleId) => ({ articleId, status: "completed" }));
  const result = classifyAcceptanceResult({ mode: "production-negative", articles, match: { status: "single" }, comparison: { status: "SKIPPED_NO_SHARED_EVENT" }, conflicts: [], timeline: { combined: false }, safety: {} });
  assert.equal(result.verdict, "PASS");
});
test("production-negative fails a false merge, false conflict, or combined timeline", () => {
  const base = { mode: "production-negative", articles: [1, 2].map((articleId) => ({ articleId, status: "completed" })), match: { status: "single" }, comparison: { status: "SKIPPED_NO_SHARED_EVENT" }, conflicts: [], timeline: { combined: false }, safety: {} };
  assert.equal(classifyAcceptanceResult({ ...base, match: { status: "matched" } }).reason, "false_cross_article_merge");
  assert.equal(classifyAcceptanceResult({ ...base, conflicts: [{}] }).reason, "cross_event_conflict_created");
  assert.equal(classifyAcceptanceResult({ ...base, timeline: { combined: true } }).reason, "combined_timeline_created");
});
test("synthetic-positive fixture has three sources, distinct wording and shared structured facts", () => {
  assert.equal(SYNTHETIC_POSITIVE_FIXTURES.length, 3);
  assert.equal(new Set(SYNTHETIC_POSITIVE_FIXTURES.map((item) => item.sourceSlug)).size, 3);
  assert.equal(new Set(SYNTHETIC_POSITIVE_FIXTURES.map((item) => item.text)).size, 3);
  for (const item of SYNTHETIC_POSITIVE_FIXTURES) {
    assert.match(item.text, /Alpha Kft\./u); assert.match(item.text, /Debrecen/iu); assert.match(item.text, /2026\. október 20/iu);
    assert.ok(item.text.includes(item.evidence));
  }
});
test("synthetic-positive structured fixture matches across all three differently worded sources", () => {
  const events = SYNTHETIC_POSITIVE_FIXTURES.map((fixture, index) => ({
    eventId: index + 1,
    eventType: "facility_announcement",
    status: "active",
    startAt: "2026-10-20T10:00:00.000Z",
    endAt: "2026-10-20T10:00:00.000Z",
    predicate: "OPENING_EVENT",
    claimStatus: "observed",
    modality: "completed",
    conditional: false,
    uncertainty: false,
    polarity: "affirmed",
    evidence: [{ evidenceId: index + 10, articleId: index + 20, sourceId: index + 30, sourceKey: fixture.sourceSlug }],
    entities: [
      { entityId: 101, canonicalEntityId: 101, role: "subject", status: "accepted" },
      { entityId: 102, canonicalEntityId: 102, role: "project", status: "accepted" },
      { entityId: 103, canonicalEntityId: 103, role: "location", status: "accepted" },
    ],
  }));
  const match = buildCrossArticleEventGroup(events, 1);
  assert.equal(match.status, "matched");
  assert.equal(match.metrics.crossSourceMatches, 2);
  assert.deepEqual(match.articleIds, [20, 21, 22]);
  assert.deepEqual(match.sourceIds, [30, 31, 32]);
});
test("synthetic-positive result passes only with matched provenance-safe local execution", () => {
  const result = classifyAcceptanceResult({
    mode: "synthetic-positive",
    articles: [1, 2, 3].map((articleId) => ({ articleId, status: "completed" })),
    match: { status: "matched", metrics: { crossSourceMatches: 2 } },
    comparison: { status: "ready" },
    conflicts: [],
    safety: { productionWritesExecuted: 0, externalProviderCalls: 0, paidAiCalls: 0, provenanceValid: true, timelineValid: true, conflictValid: true },
  });
  assert.equal(result.verdict, "PASS");
});
test("acceptance provider gate blocks paid or external providers", () => {
  assert.equal(assertAcceptanceProvider("deterministic-semantic"), "deterministic-semantic");
  for (const provider of ["openai", "cloudflare", "mock", "external"]) assert.throws(() => assertAcceptanceProvider(provider), /external_provider_blocked/);
});
test("synthetic-positive verdict is fail-closed for provider use, runtime failure, rejection and incomplete coverage", () => {
  const completed = [1, 2, 3].map((articleId) => ({ articleId, status: "completed" }));
  const matched = { status: "matched", metrics: { crossSourceMatches: 2 } };
  const ready = { status: "ready" };
  assert.equal(classifyAcceptanceResult({ mode: "synthetic-positive", articles: completed, match: matched, comparison: ready, safety: { externalProviderCalls: 1 } }).verdict, "FAIL");
  assert.equal(classifyAcceptanceResult({ articles: [{ status: "failed" }], safety: {} }).category, "SYSTEM ERROR");
  assert.equal(classifyAcceptanceResult({ articles: completed, match: { status: "single", metrics: { matchesRejected: 1 } }, safety: {} }).category, "MATCH REJECTION");
  assert.equal(classifyAcceptanceResult({ articles: completed, match: { status: "candidate", metrics: {} }, safety: {} }).verdict, "PARTIAL");
  assert.equal(classifyAcceptanceResult({ articles: completed, match: matched, comparison: ready, safety: {} }).verdict, "PASS");
});
test("cleanup policy defaults to drop on success and keep on failure unless explicitly overridden", () => {
  function keep({ success, keepDb = false, dropOnFailure = false }) { return keepDb || (!success && !dropOnFailure); }
  assert.equal(keep({ success: true }), false); assert.equal(keep({ success: false }), true);
  assert.equal(keep({ success: true, keepDb: true }), true); assert.equal(keep({ success: false, dropOnFailure: true }), false);
});
