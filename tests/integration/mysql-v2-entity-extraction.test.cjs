"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { persistEntityExtraction } = require("../../lib/v2/entity-extraction-repository");
const { lookupExactEntity, resolveExactEntity, persistObservedAlias } = require("../../lib/v2/entity-resolution-repository");

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

test("M5 MySQL exact canonical/alias lookup, accent collation and alias lifecycle", { skip: !enabled }, async () => {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const connection = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
  try {
    await applyMigrations(connection, loadMigrations());
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", ["M5 fixture", "https://example.com/m5-fixture", "https://example.com/m5-fixture", "Mészáros Acme", "pending"]);
    const [run] = await connection.execute("INSERT INTO v2_ai_runs (article_id,step_name,provider,model,prompt_version,extractor_version,schema_version,input_hash,sanitized_input_ref,status,started_at,completed_at,operation_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "entity_extraction", "mock", "m4", "m4", "m4", "v2.extraction.1", "m5", "fixture", "completed", new Date(), new Date(), `m5-${article.insertId}`]);
    const [mentionA] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "ACME", "acme", "company", 0, 4, run.insertId, "unresolved"]);
    const [entityA] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["person", "Mészáros", "mészáros", "hu", "review"]);
    const [entityB] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["person", "Meszaros", "meszaros", "hu", "review"]);
    const exact = await lookupExactEntity(connection, { name: "Mészáros", entityType: "person" });
    assert.deepEqual([exact.status, exact.entityId], ["resolved", Number(entityA.insertId)]);
    const accentMiss = await lookupExactEntity(connection, { name: "Meszaros", entityType: "person" });
    assert.deepEqual([accentMiss.status, accentMiss.entityId], ["resolved", Number(entityB.insertId)]);
    const [aliasEntity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", "Acme One", "acme one", "hu", "review"]);
    const first = await persistObservedAlias(connection, { entityId: aliasEntity.insertId, mentionId: mentionA.insertId, extractionRunId: run.insertId, alias: " ACME ", language: "hu" });
    const retry = await persistObservedAlias(connection, { entityId: aliasEntity.insertId, mentionId: mentionA.insertId, extractionRunId: run.insertId, alias: "ACME", language: "hu" });
    assert.equal(first.aliasId, retry.aliasId);
    const [[obs]] = await connection.execute("SELECT COUNT(*) count FROM v2_entity_alias_observations WHERE alias_id=?", [first.aliasId]);
    assert.equal(Number(obs.count), 1);
    const [otherEntity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", "Acme Two", "acme two", "hu", "review"]);
    await connection.execute("INSERT INTO v2_entity_aliases (entity_id,alias,normalized_alias,language,alias_type,status,created_at,updated_at) VALUES (?,?,?,?,?,'review',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [otherEntity.insertId, "ACME", "acme", "hu", "observed"]);
    const collision = await lookupExactEntity(connection, { name: "ACME", entityType: "company" });
    assert.equal(collision.status, "ambiguous");
    assert.equal(collision.review, "alias_collision");
    assert.equal((await resolveExactEntity(connection, { name: "ACME", entityType: "company", confidence: 1 })).resolutionStatus, "ambiguous");
    assert.equal((await resolveExactEntity(connection, { name: "Acme One", entityType: "company", confidence: 0.95 })).resolutionStatus, "resolved_exact");
    assert.equal((await resolveExactEntity(connection, { name: "Acme One", entityType: "company", confidence: 0.9499 })).resolutionStatus, "review");
    assert.equal((await resolveExactEntity(connection, { name: "Never Existing", entityType: "company", confidence: 1 })).resolutionStatus, "unresolved");
    assert.equal((await resolveExactEntity(connection, { name: "Acme One", entityType: "organization", confidence: 1 })).resolutionStatus, "unresolved");
  } finally {
    await connection.end();
  }
});
