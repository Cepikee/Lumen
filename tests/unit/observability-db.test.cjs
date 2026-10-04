"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { observeDbOperation, getObservabilitySnapshot } = require("../../lib/observability");

test("database diagnostics record slow operation without logging SQL or parameters", async () => {
  const logs = [];
  const before = getObservabilitySnapshot().db.dbOperations;
  const value = await observeDbOperation(() => new Promise((resolve) => setTimeout(() => resolve("ok"), 20)), { operation: "fixture" }, { env: { UTOM_DB_SLOW_WARNING_MS: "1", UTOM_DB_SLOW_CRITICAL_MS: "10" }, logger: { warn: (line) => logs.push(String(line)) } });
  assert.equal(value, "ok");
  const snapshot = getObservabilitySnapshot().db;
  assert.equal(snapshot.dbOperations, before + 1);
  assert.equal(snapshot.slowDbOperations >= 1, true);
  assert.equal(snapshot.criticalDbOperations >= 1, true);
  assert.match(logs[0], /db_operation_slow/);
  assert.doesNotMatch(logs[0], /password|token|SELECT/i);
});

test("database diagnostics count failures and rethrow the original error", async () => {
  const before = getObservabilitySnapshot().db.dbFailures;
  await assert.rejects(observeDbOperation(async () => { throw new Error("fixture_db_down"); }), /fixture_db_down/);
  assert.equal(getObservabilitySnapshot().db.dbFailures, before + 1);
});

console.log("database observability regression: PASS");
