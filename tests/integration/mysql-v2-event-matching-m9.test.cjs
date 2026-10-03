"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { validateEventCandidate } = require("../../lib/v2/event-matching");
const { persistEventCandidate } = require("../../lib/v2/event-matching-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }

test("M9 MySQL candidate event and membership retry are idempotent", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const suffix = Date.now();
    await connection.beginTransaction();
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M9 ${suffix}`, `https://example.com/m9-${suffix}`, `https://example.com/m9-${suffix}`, "Acme acquired Beta.", "pending"]);
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", `M9 ${suffix}`, `m9 ${suffix}`, "hu", "active"]);
    const candidate = validateEventCandidate({ eventType: "acquisition", canonicalTitle: `Acme acquired Beta ${suffix}`, articleId: article.insertId, startAt: "2026-10-01T00:00:00Z", confidence: 0.9, entities: [{ entityId: entity.insertId, role: "buyer", confidence: 0.9 }] }).result;
    const first = await persistEventCandidate(connection, candidate);
    const retry = await persistEventCandidate(connection, candidate);
    assert.equal(first.eventId, retry.eventId);
    const [[counts]] = await connection.execute("SELECT (SELECT COUNT(*) FROM v2_events WHERE id=?) events, (SELECT COUNT(*) FROM v2_event_articles WHERE event_id=?) articles, (SELECT COUNT(*) FROM v2_event_entities WHERE event_id=?) entities", [first.eventId, first.eventId, first.eventId]);
    assert.deepEqual([Number(counts.events), Number(counts.articles), Number(counts.entities)], [1, 1, 1]);
    await connection.rollback();
  } finally { await connection.end(); }
});

test("M9 MySQL invalid entity FK rolls back event and concurrent workers keep one membership", { skip: !enabled }, async () => {
  const connection = await connect();
  const worker = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const suffix = Date.now();
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M9 C ${suffix}`, `https://example.com/m9-c-${suffix}`, `https://example.com/m9-c-${suffix}`, "Concurrent event.", "pending"]);
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", ["company", `M9 C ${suffix}`, `m9 c ${suffix}`, "hu", "active"]);
    const candidate = validateEventCandidate({ eventType: "acquisition", canonicalTitle: `Concurrent event ${suffix}`, articleId: article.insertId, startAt: "2026-10-01T00:00:00Z", confidence: 0.9, entities: [{ entityId: entity.insertId, role: "buyer", confidence: 0.9 }] }).result;
    await connection.beginTransaction();
    await assert.rejects(() => persistEventCandidate(connection, { ...candidate, entities: [{ ...candidate.entities[0], entityId: 999999999 }] }));
    await connection.rollback();
    const [[rolledBack]] = await connection.execute("SELECT COUNT(*) count FROM v2_events WHERE normalized_key=?", [candidate.normalizedKey]);
    assert.equal(Number(rolledBack.count), 0);

    const results = await Promise.allSettled([persistEventCandidate(connection, candidate), persistEventCandidate(worker, candidate)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
    const [[counts]] = await connection.execute("SELECT (SELECT COUNT(*) FROM v2_events WHERE normalized_key=?) events, (SELECT COUNT(*) FROM v2_event_articles WHERE article_id=?) articles, (SELECT COUNT(*) FROM v2_event_entities WHERE entity_id=?) entities", [candidate.normalizedKey, article.insertId, entity.insertId]);
    assert.deepEqual([Number(counts.events), Number(counts.articles), Number(counts.entities)], [1, 1, 1]);
  } finally { await connection.end(); await worker.end(); }
});

console.log("M9 MySQL event matching regression: PASS");
