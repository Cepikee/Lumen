"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { resolveEntityMention, persistEntityResolution, onboardEntityMention, persistProvisionalEntityResolution } = require("../../lib/v2/entity-resolution-repository");

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

test("V21 provisional entity onboarding is evidence-bound, scoped and idempotent", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const suffix = Date.now();
    const content = "Nagy Péter vezeti az Alpha Zrt.-t.";
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", ["", `https://example.com/v21-${suffix}`, `https://example.com/v21-${suffix}`, content, "pending"]);
    const [run] = await connection.execute("INSERT INTO v2_ai_runs (article_id,step_name,provider,model,prompt_version,extractor_version,schema_version,input_hash,sanitized_input_ref,status,started_at,completed_at,operation_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "entity_extraction", "mock", "m4", "m4", "m4", "v2.extraction.1", `v21-${suffix}`, "fixture", "completed", new Date(), new Date(), `v21-${suffix}`]);
    const [mention] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Nagy Péter", "nagy péter", "person", 0, 10, run.insertId, "unresolved"]);
    await connection.beginTransaction();
    const first = await onboardEntityMention(connection, { mentionId: mention.insertId, articleId: article.insertId, name: "Nagy Péter", entityType: "person", confidence: 0.91, context: { provisionalScopeKey: "story-a" }, runId: run.insertId });
    await persistProvisionalEntityResolution(connection, { mentionId: mention.insertId, result: first, runId: run.insertId });
    await connection.commit();
    assert.equal(first.entityStatus, "unresolved");
    assert.equal(first.provisional, true);

    await connection.beginTransaction();
    const retry = await onboardEntityMention(connection, { mentionId: mention.insertId, articleId: article.insertId, name: "Nagy Péter", entityType: "person", confidence: 0.91, context: { provisionalScopeKey: "story-a" }, runId: run.insertId });
    await persistProvisionalEntityResolution(connection, { mentionId: mention.insertId, result: retry, runId: run.insertId });
    await connection.commit();
    assert.equal(retry.entityId, first.entityId);
    const [[sameScope]] = await connection.execute("SELECT COUNT(*) count FROM v2_entities WHERE id=?", [first.entityId]);
    assert.equal(Number(sameScope.count), 1);

    const [otherMention] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Nagy Péter", "nagy péter", "person", 0, 10, run.insertId, "unresolved"]);
    await connection.beginTransaction();
    const other = await onboardEntityMention(connection, { mentionId: otherMention.insertId, articleId: article.insertId, name: "Nagy Péter", entityType: "person", confidence: 0.91, context: { provisionalScopeKey: "story-b" }, runId: run.insertId });
    await persistProvisionalEntityResolution(connection, { mentionId: otherMention.insertId, result: other, runId: run.insertId });
    await connection.commit();
    assert.notEqual(other.entityId, first.entityId);

    const orgStart = content.indexOf("Alpha Zrt.");
    const [orgMention] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Alpha Zrt.", "alpha zrt.", "company", orgStart, orgStart + "Alpha Zrt.".length, run.insertId, "unresolved"]);
    await connection.beginTransaction();
    const org = await onboardEntityMention(connection, { mentionId: orgMention.insertId, articleId: article.insertId, name: "Alpha Zrt.", entityType: "company", confidence: 0.91, context: { provisionalScopeKey: "story-a" }, runId: run.insertId });
    await persistProvisionalEntityResolution(connection, { mentionId: orgMention.insertId, result: org, runId: run.insertId });
    await connection.commit();
    assert.notEqual(org.entityId, first.entityId);

    const [badMention] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Nagy Péter", "nagy péter", "person", 1, 11, run.insertId, "unresolved"]);
    await assert.rejects(() => onboardEntityMention(connection, { mentionId: badMention.insertId, articleId: article.insertId, name: "Nagy Péter", entityType: "person", confidence: 0.91, context: { provisionalScopeKey: "story-c" }, runId: run.insertId }), /entity_evidence_invalid/);
    const [evidenceLessMention] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "", "nagy péter", "person", 0, 0, run.insertId, "unresolved"]);
    await assert.rejects(() => onboardEntityMention(connection, { mentionId: evidenceLessMention.insertId, articleId: article.insertId, name: "Nagy Péter", entityType: "person", confidence: 0.91, context: { provisionalScopeKey: "story-evidence-less" }, runId: run.insertId }), /entity_evidence_invalid/);

    const [mentionA] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Nagy Péter", "nagy péter", "person", 0, 10, run.insertId, "unresolved"]);
    const [mentionB] = await connection.execute("INSERT INTO v2_entity_mentions (article_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,resolution_status,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [article.insertId, "Nagy Péter", "nagy péter", "person", 0, 10, run.insertId, "unresolved"]);
    const workerA = await connect();
    const workerB = await connect();
    try {
      const worker = async (workerConnection, mentionId) => {
        await workerConnection.beginTransaction();
        try {
          const anchor = await onboardEntityMention(workerConnection, { mentionId, articleId: article.insertId, name: "Nagy Péter", entityType: "person", confidence: 0.91, context: { provisionalScopeKey: "concurrent-story" }, runId: run.insertId });
          await persistProvisionalEntityResolution(workerConnection, { mentionId, result: anchor, runId: run.insertId });
          await workerConnection.commit();
          return anchor;
        } catch (error) { await workerConnection.rollback(); throw error; }
      };
      const [anchorA, anchorB] = await Promise.all([worker(workerA, mentionA.insertId), worker(workerB, mentionB.insertId)]);
      assert.equal(anchorA.entityId, anchorB.entityId);
      const [[concurrentCount]] = await connection.execute("SELECT COUNT(*) count FROM v2_entities WHERE identity_scope_key=?", [anchorA.scopeKey]);
      assert.equal(Number(concurrentCount.count), 1);
    } finally {
      await workerA.end();
      await workerB.end();
    }
  } finally {
    await connection.end();
  }
});
