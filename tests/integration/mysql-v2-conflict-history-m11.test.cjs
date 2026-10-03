"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { detectConflict } = require("../../lib/v2/conflict-history");
const { persistConflict, recordConfidenceChange } = require("../../lib/v2/conflict-history-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }
function claim(id, value) { return { id, subjectEntityId: 1, predicate: "STATUS", claimType: "categorical", normalizedValue: value, validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-02-01T00:00:00Z", evidence: [{ evidenceId: id + 100 }] }; }
async function resetM11(connection) { await connection.execute("DELETE FROM v2_confidence_history"); await connection.execute("DELETE FROM v2_entity_graph_history"); await connection.execute("DELETE FROM v2_conflicts"); }

test("M11 MySQL conflict persistence is symmetric and retry-safe", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    await resetM11(connection);
    const conflict = detectConflict(claim(101, "open"), claim(102, "closed"));
    const first = await persistConflict(connection, conflict);
    const retry = await persistConflict(connection, conflict);
    assert.equal(first.conflictId, retry.conflictId);
    assert.equal(retry.idempotent, true);
    const [[count]] = await connection.execute("SELECT COUNT(*) count FROM v2_conflicts WHERE fingerprint=?", [conflict.fingerprint]);
    assert.equal(Number(count.count), 1);
  } finally { await connection.end(); }
});

test("M11 MySQL confidence history is append-only and duplicate operation is idempotent", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    await resetM11(connection);
    const operationKey = "b".repeat(64);
    const input = { objectType: "claim", objectId: 101, oldConfidence: 0.8, newConfidence: 0.6, reason: "conflict_detection", evidenceDelta: { added: 1 }, operationKey, resolverVersion: "v2.conflict-history.1" };
    const first = await recordConfidenceChange(connection, input);
    const retry = await recordConfidenceChange(connection, input);
    assert.equal(first.idempotent, false);
    assert.equal(retry.idempotent, true);
    const [[count]] = await connection.execute("SELECT COUNT(*) count FROM v2_confidence_history WHERE object_type='claim' AND object_id=101");
    assert.equal(Number(count.count), 1);
  } finally { await connection.end(); }
});

test("M11 MySQL caller rollback removes conflict and confidence history", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    await resetM11(connection);
    await connection.beginTransaction();
    const conflict = detectConflict(claim(201, "open"), claim(202, "closed"));
    await persistConflict(connection, conflict);
    await recordConfidenceChange(connection, { objectType: "claim", objectId: 201, oldConfidence: 0.4, newConfidence: 0.3, reason: "conflict_detection", operationKey: "c".repeat(64) });
    await connection.rollback();
    const [[conflicts]] = await connection.execute("SELECT COUNT(*) count FROM v2_conflicts WHERE fingerprint=?", [conflict.fingerprint]);
    const [[history]] = await connection.execute("SELECT COUNT(*) count FROM v2_confidence_history WHERE object_type='claim' AND object_id=201");
    assert.deepEqual([Number(conflicts.count), Number(history.count)], [0, 0]);
  } finally { await connection.end(); }
});

test("M11 MySQL concurrent workers keep one conflict and one confidence history row", { skip: !enabled }, async () => {
  const first = await connect(); const second = await connect();
  try {
    await applyMigrations(first, loadMigrations());
    await resetM11(first);
    const conflict = detectConflict(claim(301, "open"), claim(302, "closed"));
    const operationKey = "d".repeat(64);
    const results = await Promise.all([
      persistConflict(first, conflict),
      persistConflict(second, conflict),
    ]);
    assert.equal(results.length, 2);
    await Promise.all([
      recordConfidenceChange(first, { objectType: "claim", objectId: 301, oldConfidence: 0.7, newConfidence: 0.5, reason: "conflict_detection", operationKey }),
      recordConfidenceChange(second, { objectType: "claim", objectId: 301, oldConfidence: 0.7, newConfidence: 0.5, reason: "conflict_detection", operationKey }),
    ]);
    const [[conflicts]] = await first.execute("SELECT COUNT(*) count FROM v2_conflicts WHERE fingerprint=?", [conflict.fingerprint]);
    const [[history]] = await first.execute("SELECT COUNT(*) count FROM v2_confidence_history WHERE object_type='claim' AND object_id=301");
    assert.deepEqual([Number(conflicts.count), Number(history.count)], [1, 1]);
  } finally { await first.end(); await second.end(); }
});

console.log("M11 MySQL conflict/confidence history regression: PASS");
