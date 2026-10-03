"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { resolveEntityMention, persistEntityResolution } = require("../../lib/v2/entity-resolution-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
}

test("M6 MySQL bounded candidate, exact short-circuit and idempotent resolution audit", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    await connection.beginTransaction();
    const suffix = Date.now();
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M6 fixture ${suffix}`, `https://example.com/m6-${suffix}`, `https://example.com/m6-${suffix}`, "Alpha", "pending"]);
    const [run] = await connection.execute("INSERT INTO v2_ai_runs (article_id,step_name,provider,model,prompt_version,extractor_version,schema_version,input_hash,sanitized_input_ref,status,started_at,completed_at,operation_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "entity_extraction", "mock", "m4", "m4", "m4", "v2.extraction.1", `m6-${suffix}`, "fixture", "completed", new Date(), new Date(), `m6-${suffix}`]);
    const [mention] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Alpha", "alpha", "company", 0, 5, run.insertId, "unresolved"]);
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", "Alpha Group", "alpha group", "hu", "active"]);
    const candidate = await resolveEntityMention(connection, { name: "Alpha", entityType: "company", confidence: 0.99 });
    assert.equal(candidate.resolutionStatus, "review");
    assert.equal(candidate.selectedEntityId, null);
    const exact = await resolveEntityMention(connection, { name: "Alpha Group", entityType: "company", confidence: 0.99 });
    assert.equal(exact.resolutionStatus, "resolved_exact");
    const persisted = await persistEntityResolution(connection, { mentionId: mention.insertId, result: exact });
    const retry = await persistEntityResolution(connection, { mentionId: mention.insertId, result: exact });
    assert.equal(persisted.entityId, Number(entity.insertId));
    assert.equal(retry.idempotent, true);
    const [[history]] = await connection.execute("SELECT COUNT(*) count FROM v2_entity_graph_history WHERE object_type='entity_mention' AND object_id=?", [mention.insertId]);
    const [[confidence]] = await connection.execute("SELECT COUNT(*) count FROM v2_confidence_history WHERE object_type='entity_mention' AND object_id=?", [mention.insertId]);
    assert.equal(Number(history.count), 1);
    assert.equal(Number(confidence.count), 1);
    await connection.rollback();
  } finally {
    await connection.end();
  }
});
