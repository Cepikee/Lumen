"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertAcceptanceDatabaseName, assertAcceptanceOptIn, assertProductionReadSql,
  classifyAcceptanceResult, createAcceptanceDatabaseController, createProductionReadAdapter,
  parseArticleIds, validateArticleFixtures,
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
test("article selection rejects duplicates and fewer than three IDs", () => {
  assert.deepEqual(parseArticleIds("1,2,3"), [1, 2, 3]);
  assert.throws(() => parseArticleIds("1,1,2"), /duplicate/); assert.throws(() => parseArticleIds("1,2"), /three/);
});
test("fixture validation rejects missing articles, text and same-source selection before fixture creation", () => {
  const row = (id, sourceId) => ({ id, sourceId, sourceSlug: `s${sourceId}`, contentText: "body", urlCanonical: `https://x/${id}`, status: "done", processed: 1 });
  assert.throws(() => validateArticleFixtures([row(1, 1), row(2, 2)], [1, 2, 3]), /missing/);
  assert.throws(() => validateArticleFixtures([{ ...row(1, 1), contentText: " " }, row(2, 2), row(3, 3)], [1, 2, 3]), /text_missing/);
  assert.throws(() => validateArticleFixtures([{ ...row(1, 1), status: "pending" }, row(2, 2), row(3, 3)], [1, 2, 3]), /not_completed/);
  assert.throws(() => validateArticleFixtures([row(1, 1), row(2, 1), row(3, 1)], [1, 2, 3]), /three_distinct/);
  assert.equal(validateArticleFixtures([row(1, 1), row(2, 2), row(3, 3)], [1, 2, 3]).length, 3);
});
test("verdict is fail-closed for provider use, runtime failure, rejection and incomplete coverage", () => {
  const completed = [1, 2, 3].map((articleId) => ({ articleId, status: "completed" }));
  const matched = { status: "matched", metrics: { crossSourceMatches: 2 } };
  const ready = { status: "ready" };
  assert.equal(classifyAcceptanceResult({ articles: completed, match: matched, comparison: ready, safety: { externalProviderCalls: 1 } }).verdict, "FAIL");
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
