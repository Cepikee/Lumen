"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { persistRelationWithEvidence } = require("../../lib/v2/relation-extraction-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
}

test("M7 MySQL relation/evidence idempotency, multiple evidence and rollback", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    await connection.beginTransaction();
    const suffix = Date.now();
    const [articleA] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M7 A ${suffix}`, `https://example.com/m7-a-${suffix}`, `https://example.com/m7-a-${suffix}`, "A works for B.", "pending"]);
    const [articleB] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M7 B ${suffix}`, `https://example.com/m7-b-${suffix}`, `https://example.com/m7-b-${suffix}`, "A supports B.", "pending"]);
    const [entityA] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["person", `M7 A ${suffix}`, `m7 a ${suffix}`, "hu", "active"]);
    const [entityB] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", `M7 B ${suffix}`, `m7 b ${suffix}`, "hu", "active"]);
    const base = { subjectEntityId: entityA.insertId, predicate: "WORKS_FOR", objectEntityId: entityB.insertId, confidence: 0.91, validFrom: null, validUntil: null, supportType: "support" };
    const first = await persistRelationWithEvidence(connection, { relation: { ...base, evidence: { start: 0, end: 13, textSpan: "A works for B" } }, articleId: articleA.insertId });
    const retry = await persistRelationWithEvidence(connection, { relation: { ...base, evidence: { start: 0, end: 13, textSpan: "A works for B" } }, articleId: articleA.insertId });
    const secondEvidence = await persistRelationWithEvidence(connection, { relation: { ...base, evidence: { start: 0, end: 12, textSpan: "A supports B" } }, articleId: articleB.insertId });
    assert.equal(first.relationId, retry.relationId);
    assert.equal(first.evidenceId, retry.evidenceId);
    assert.equal(secondEvidence.relationId, first.relationId);
    assert.notEqual(secondEvidence.evidenceId, first.evidenceId);
    const [[counts]] = await connection.execute("SELECT COUNT(*) relations, (SELECT COUNT(*) FROM v2_relation_evidence WHERE relation_id=?) evidence_count FROM v2_entity_relations WHERE id=?", [first.relationId, first.relationId]);
    assert.deepEqual([Number(counts.relations), Number(counts.evidence_count)], [1, 2]);
    await connection.rollback();

    await connection.beginTransaction();
    const [rollbackArticle] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M7 R ${suffix}`, `https://example.com/m7-r-${suffix}`, `https://example.com/m7-r-${suffix}`, "A works for B.", "pending"]);
    const [rollbackSubject] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["person", `M7 R A ${suffix}`, `m7 r a ${suffix}`, "hu", "active"]);
    const [rollbackObject] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", `M7 R B ${suffix}`, `m7 r b ${suffix}`, "hu", "active"]);
    await persistRelationWithEvidence(connection, { relation: { ...base, subjectEntityId: rollbackSubject.insertId, objectEntityId: rollbackObject.insertId, evidence: { start: 0, end: 13, textSpan: "A works for B" } }, articleId: rollbackArticle.insertId });
    await connection.rollback();
    const [[afterRollback]] = await connection.execute("SELECT COUNT(*) count FROM articles WHERE url_canonical=?", [`https://example.com/m7-r-${suffix}`]);
    assert.equal(Number(afterRollback.count), 0);
  } finally {
    await connection.end();
  }
});
