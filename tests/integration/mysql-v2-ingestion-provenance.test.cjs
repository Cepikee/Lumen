"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { persistIngestionProvenance } = require("../../lib/v2/ingestion-provenance-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);

function safeConfig() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const database = url.pathname.slice(1);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !database.endsWith("_test")) throw new Error("MySQL integration tests require a loopback _test database");
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

async function resetDatabase(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  const [tables] = await connection.query("SHOW TABLES");
  for (const row of tables) await connection.query(`DROP TABLE \`${Object.values(row)[0]}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
}

function envelope(operationKey, runId = "22222222-2222-4222-8222-222222222222", sourceId = 2) {
  return {
    envelopeVersion: "v2.ingestion.1",
    article: { canonicalUrl: "https://24.hu/cikk?id=1", urlIdentity: "a".repeat(64) },
    source: { sourceId, key: "24.hu", displayName: "24.hu" },
    publication: { occurredAt: "2026-09-28T09:00:00.000Z", source: "feed_explicit" },
    observedAt: "2026-09-28T09:30:00.000Z",
    provenance: { requestId: "11111111-1111-4111-8111-111111111111", runId, operationKey },
  };
}

test("M2 provenance persistence is idempotent, append-oriented and rollback-safe", { skip: !enabled }, async () => {
  const connection = await mysql.createConnection(safeConfig());
  try {
    await resetDatabase(connection);
    await applyMigrations(connection, loadMigrations());
    const [source] = await connection.execute("INSERT INTO sources (slug,name,homepage_url,is_active) VALUES ('24.hu','24.hu','https://24.hu',1)");
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,source_id,source,status) VALUES ('M2 fixture','https://24.hu/cikk?id=1',?,?, 'pending')", [source.insertId, "24.hu"]);
    const first = await persistIngestionProvenance(connection, { articleId: article.insertId, envelope: envelope("1".repeat(64), undefined, source.insertId) });
    const retry = await persistIngestionProvenance(connection, { articleId: article.insertId, envelope: envelope("1".repeat(64), "33333333-3333-4333-8333-333333333333", source.insertId) });
    const secondEvent = await persistIngestionProvenance(connection, { articleId: article.insertId, envelope: envelope("2".repeat(64), "44444444-4444-4444-8444-444444444444", source.insertId) });
    assert.equal(first.inserted, true);
    assert.equal(retry.inserted, false);
    assert.equal(secondEvent.inserted, true);
    const [[count]] = await connection.execute("SELECT COUNT(*) count FROM v2_ingestion_provenance WHERE article_id=?", [article.insertId]);
    assert.equal(Number(count.count), 2);
    await connection.beginTransaction();
    try {
      await persistIngestionProvenance(connection, { articleId: article.insertId, envelope: envelope("3".repeat(64), undefined, source.insertId) });
      await connection.rollback();
    } finally {
      // The shared test connection remains caller-owned and is closed below.
    }
    const [[rolledBack]] = await connection.execute("SELECT COUNT(*) count FROM v2_ingestion_provenance WHERE operation_key=?", ["3".repeat(64)]);
    assert.equal(Number(rolledBack.count), 0);

    await resetDatabase(connection);
    const migrations = loadMigrations();
    const baseline = migrations.filter((migration) => Number(migration.version) <= 52);
    const provenanceMigrations = migrations.filter((migration) => Number(migration.version) <= 53);
    await applyMigrations(connection, baseline);
    const upgraded = await applyMigrations(connection, provenanceMigrations);
    assert.deepEqual(upgraded, ["053_v2_ingestion_provenance.sql"]);
    const [[extension]] = await connection.execute("SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='v2_ingestion_provenance'");
    assert.equal(Number(extension.count), 1);
  } finally {
    await connection.end();
  }
});

console.log("M2 MySQL provenance persistence: PASS");
