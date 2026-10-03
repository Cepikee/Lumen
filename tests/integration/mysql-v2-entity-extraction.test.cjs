"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { persistEntityExtraction } = require("../../lib/v2/entity-extraction-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);

test("M4 MySQL persistence, retry idempotency and rollback", { skip: !enabled }, async () => {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const connection = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
  try {
    await applyMigrations(connection, loadMigrations());
    await connection.beginTransaction();
    const text = "AA BB CC DD EE FF GG";
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", ["M4 fixture", "https://example.com/m4-fixture", "https://example.com/m4-fixture", text, "pending"]);
    const envelope = createIngestionEnvelope({ originalUrl: "https://example.com/m4-fixture", title: "", content: text }).envelope;
    const types = ["person", "company", "organization", "location", "project", "product", "topic"];
    const outcome = { status: "completed", provider: "mock", model: "deterministic-mock-entity-v1", result: { entities: types.map((entityType, index) => ({ mentionText: text.slice(index * 3, index * 3 + 2), normalizedCandidateName: text.slice(index * 3, index * 3 + 2), entityType, confidence: index === 0 ? 0 : index === 6 ? 1 : 0.5, evidence: { start: index * 3, end: index * 3 + 2 } })) } };
    const first = await persistEntityExtraction(connection, { articleId: article.insertId, envelope, outcome });
    const retry = await persistEntityExtraction(connection, { articleId: article.insertId, envelope, outcome });
    assert.equal(first.runId, retry.runId);
    const [[counts]] = await connection.query("SELECT COUNT(*) AS mentions, COUNT(DISTINCT extraction_run_id) AS runs FROM v2_entity_mentions WHERE article_id=?", [article.insertId]);
    assert.deepEqual([Number(counts.mentions), Number(counts.runs)], [7, 1]);
    const [typesInDb] = await connection.query("SELECT DISTINCT entity_type FROM v2_entity_mentions WHERE article_id=? ORDER BY entity_type", [article.insertId]);
    assert.deepEqual(typesInDb.map((row) => row.entity_type), [...types].sort());
    await connection.rollback();

    await connection.beginTransaction();
    const [rollbackArticle] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", ["M4 rollback", "https://example.com/m4-rollback", "https://example.com/m4-rollback", "M4", "pending"]);
    const rollbackEnvelope = createIngestionEnvelope({ originalUrl: "https://example.com/m4-rollback", title: "M4", content: "M4" }).envelope;
    await persistEntityExtraction(connection, { articleId: rollbackArticle.insertId, envelope: rollbackEnvelope, outcome: { ...outcome, result: { entities: [] } } });
    await connection.rollback();
    const [[rollbackCount]] = await connection.query("SELECT COUNT(*) AS count FROM v2_ai_runs WHERE article_id=?", [rollbackArticle.insertId]);
    assert.equal(Number(rollbackCount.count), 0);
  } finally {
    await connection.end();
  }
});
