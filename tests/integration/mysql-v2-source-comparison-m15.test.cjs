"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { compareSources, compareSourcesDetailed } = require("../../lib/v2/read-model-repository");
const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }

test("M15 MySQL source comparison uses canonical sources, membership evidence and exact propositions", { skip: !enabled }, async () => {
  const connection = await connect(); const suffix = `m15-${Date.now()}`; const sourceIds = []; const articleIds = []; const claimIds = []; const groupIds = []; let eventId; let emptyEventId; let entityId;
  try {
    await applyMigrations(connection, loadMigrations());
    for (const name of ["M15 Alpha", "M15 Beta"]) { const [source] = await connection.execute("INSERT INTO sources (slug,name,is_active) VALUES (?,?,1)", [`${suffix}-${name.endsWith("Alpha") ? "alpha" : "beta"}`, name]); sourceIds.push(Number(source.insertId)); }
    for (const [index, sourceId] of sourceIds.entries()) { const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,source_id,source,status,published_at) VALUES (?,?,?,?,?,?)", [`${suffix}-${index}`, `https://${suffix}.invalid/${index}`, sourceId, index ? "legacy beta label" : "legacy alpha label", "done", `2026-01-0${index + 1} 10:00:00`]); articleIds.push(Number(article.insertId)); }
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES ('company',?,?, 'hu','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`${suffix} Entity`, `${suffix} entity`]); entityId = Number(entity.insertId);
    const [event] = await connection.execute("INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,created_at,updated_at) VALUES ('topic',?,?, 'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`${suffix} event`, suffix]); eventId = Number(event.insertId);
    async function group(predicate, scope) { const [insert] = await connection.execute("INSERT INTO v2_claim_groups (subject_entity_id,predicate,time_scope_key,resolution_status,created_at,updated_at) VALUES (?,?,?,'resolved',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [entityId, predicate, scope]); groupIds.push(Number(insert.insertId)); return Number(insert.insertId); }
    async function claim(articleIndex, claimGroupId, predicate, value, key) {
      const [insert] = await connection.execute("INSERT INTO v2_claims (subject_entity_id,predicate,value_json,normalized_value,claim_type,article_id,source_id,valid_from,valid_until,observed_at,publication_time,status,claim_group_id,observation_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?,'observed',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [entityId, predicate, JSON.stringify({ value, polarity: "affirmed", uncertainty: false, conditional: false, attributionType: "direct" }), String(value), "numeric", articleIds[articleIndex], sourceIds[articleIndex], "2026-01-01 00:00:00", "2026-01-02 00:00:00", "2026-01-01 10:00:00", claimGroupId, `${suffix}-${key}`]);
      const claimId = Number(insert.insertId); claimIds.push(claimId);
      const [evidence] = await connection.execute("INSERT INTO v2_claim_evidence (claim_id,article_id,source_id,text_span,span_hash,evidence_type,support_type,created_at) VALUES (?,?,?,?,?,'claim_span','support',UTC_TIMESTAMP(6))", [claimId, articleIds[articleIndex], sourceIds[articleIndex], `${predicate} evidence ${articleIndex}`, `${String(claimId).padStart(64, "0")}`]);
      return { claimId, evidenceId: Number(evidence.insertId) };
    }
    const sharedGroup = await group("EMPLOYEE_COUNT", `${suffix}/shared`);
    const sharedA = await claim(0, sharedGroup, "EMPLOYEE_COUNT", 20, "shared-a"); const sharedB = await claim(1, sharedGroup, "EMPLOYEE_COUNT", 20, "shared-b");
    const detailGroup = await group("EXTRA_DETAIL", `${suffix}/detail`); const detailA = await claim(0, detailGroup, "EXTRA_DETAIL", 300, "detail-a");
    await connection.execute("INSERT INTO v2_event_articles (event_id,article_id,membership_type,evidence_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))", [eventId, articleIds[0], "coverage", sharedA.evidenceId]);
    await connection.execute("INSERT INTO v2_event_articles (event_id,article_id,membership_type,evidence_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))", [eventId, articleIds[1], "coverage", sharedB.evidenceId]);
    await connection.execute("INSERT INTO v2_event_articles (event_id,article_id,membership_type,evidence_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))", [eventId, articleIds[0], "detail", detailA.evidenceId]);
    const basic = await compareSources(connection, { type: "event", id: eventId });
    assert.deepEqual(basic.sources.map((source) => source.key), [`${suffix}-alpha`, `${suffix}-beta`]);
    let queryCount = 0; const execute = connection.execute.bind(connection); connection.execute = async (...args) => { queryCount += 1; return execute(...args); };
    const detailed = await compareSourcesDetailed(connection, { type: "event", id: eventId });
    assert.equal(queryCount, 2);
    assert.equal(detailed.status, "ready");
    assert.equal(detailed.claims.length, 2);
    assert.equal(detailed.claims.find((item) => item.predicate === "EMPLOYEE_COUNT").coverage, "shared");
    const sourceOnly = detailed.claims.find((item) => item.predicate === "EXTRA_DETAIL");
    assert.equal(sourceOnly.coverage, "source_only");
    assert.equal(sourceOnly.coverageBySource.find((item) => item.source.key === `${suffix}-beta`).state, "not_covered");
    assert.equal(detailed.claims.every((item) => item.observations.every((observation) => observation.evidence.length > 0)), true);
    const emptyEvent = await execute("INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,created_at,updated_at) VALUES ('topic',?,?, 'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`${suffix} empty`, `${suffix}-empty`]); emptyEventId = Number(emptyEvent[0].insertId);
    const empty = await compareSourcesDetailed(connection, { type: "event", id: emptyEventId });
    assert.deepEqual(empty.claims, []); assert.deepEqual(empty.sources, []);
  } finally {
    if (eventId) await connection.execute("DELETE FROM v2_events WHERE id=?", [eventId]);
    if (emptyEventId) await connection.execute("DELETE FROM v2_events WHERE id=?", [emptyEventId]);
    if (claimIds.length) await connection.execute(`DELETE FROM v2_claim_evidence WHERE claim_id IN (${claimIds.map(() => "?").join(",")})`, claimIds);
    if (claimIds.length) await connection.execute(`DELETE FROM v2_claims WHERE id IN (${claimIds.map(() => "?").join(",")})`, claimIds);
    if (groupIds.length) await connection.execute(`DELETE FROM v2_claim_groups WHERE id IN (${groupIds.map(() => "?").join(",")})`, groupIds);
    if (entityId) await connection.execute("DELETE FROM v2_entities WHERE id=?", [entityId]);
    if (articleIds.length) await connection.execute(`DELETE FROM articles WHERE id IN (${articleIds.map(() => "?").join(",")})`, articleIds);
    if (sourceIds.length) await connection.execute(`DELETE FROM sources WHERE id IN (${sourceIds.map(() => "?").join(",")})`, sourceIds);
    await connection.end();
  }
});

console.log("M15 MySQL source comparison regression: PASS");
