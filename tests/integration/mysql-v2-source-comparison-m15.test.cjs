"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { compareSources, compareSourcesDetailed } = require("../../lib/v2/read-model-repository");
const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }

test("M15 MySQL source comparison preserves coverage semantics, values and bounded reads", { skip: !enabled }, async () => {
  const connection = await connect();
  const suffix = `m15-${Date.now()}`;
  const sourceIds = [];
  const articleIds = [];
  const claimIds = [];
  let eventId;
  try {
    await applyMigrations(connection, loadMigrations());
    for (const name of ["M15 Alpha", "M15 Beta", "M15 Empty"]) {
      const [source] = await connection.execute("INSERT INTO sources (slug,name,is_active) VALUES (?,?,1)", [`${suffix}-${name.replace(/ /g, "-").toLowerCase()}`, name]);
      sourceIds.push(Number(source.insertId));
    }
    for (const [index, sourceId] of sourceIds.slice(0, 2).entries()) {
      const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,source_id,source,status,published_at) VALUES (?,?,?,?,?,?)", [`${suffix}-${index}`, `https://${suffix}.invalid/${index}`, sourceId, index === 0 ? "M15 Alpha" : "M15 Beta", "done", `2026-01-0${index + 1} 10:00:00`]);
      articleIds.push(Number(article.insertId));
    }
    const [event] = await connection.execute("INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,created_at,updated_at) VALUES ('topic',?,?, 'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`${suffix} event`, suffix]);
    eventId = Number(event.insertId);
    for (const articleId of articleIds) await connection.execute("INSERT INTO v2_event_articles (event_id,article_id,membership_type,created_at) VALUES (?,?,?,UTC_TIMESTAMP(6))", [eventId, articleId, "observed"]);
    const [group] = await connection.execute("INSERT INTO v2_claim_groups (subject_entity_id,predicate,time_scope_key,resolution_status,created_at,updated_at) VALUES (NULL,?,?, 'unresolved',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`${suffix}-shared`, `${suffix}/shared`]);
    const sharedGroupId = Number(group.insertId);
    async function addClaim(articleId, sourceId, claimGroupId, predicate, value, validFrom, validUntil, attributionType) {
      const numeric = typeof value === "number" || (value && typeof value === "object" && typeof value.value === "number");
      const [claim] = await connection.execute("INSERT INTO v2_claims (predicate,value_json,normalized_value,claim_type,article_id,source_id,valid_from,valid_until,observed_at,publication_time,status,claim_group_id,observation_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?,UTC_TIMESTAMP(6),?, 'observed',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [predicate, JSON.stringify({ value, attributionType }), numeric ? String(typeof value === "object" ? value.value : value) : String(value), numeric ? "numeric" : "categorical", articleId, sourceId, validFrom, validUntil, `2026-01-01 10:00:00`, claimGroupId, `${suffix}-${claimIds.length}-${predicate}`]);
      const claimId = Number(claim.insertId); claimIds.push(claimId);
      await connection.execute("INSERT INTO v2_claim_evidence (claim_id,article_id,source_id,text_span,span_hash,evidence_type,support_type,created_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [claimId, articleId, sourceId, `${predicate} evidence`, `${String(claimId).padStart(64, "0")}`, "claim_span", "support"]);
      return claimId;
    }
    const sharedA = await addClaim(articleIds[0], sourceIds[0], sharedGroupId, "injured", { value: 10, unit: "fő" }, "2026-01-01 00:00:00", "2026-01-02 00:00:00", "police");
    const sharedB = await addClaim(articleIds[1], sourceIds[1], sharedGroupId, "injured", { value: 14, unit: "fő" }, "2026-01-01 00:00:00", "2026-01-02 00:00:00", "hospital");
    await addClaim(articleIds[0], sourceIds[0], null, "location", "Budapest", null, null, "official");
    await addClaim(articleIds[1], sourceIds[1], null, "status", "closed", "2026-01-03 00:00:00", "2026-01-04 00:00:00", "official");
    const defaultResult = await compareSources(connection, { type: "event", id: eventId });
    assert.equal(defaultResult.sources.length, 2);
    let queryCount = 0;
    const originalExecute = connection.execute.bind(connection);
    connection.execute = async (...args) => { queryCount += 1; return originalExecute(...args); };
    const detailed = await compareSourcesDetailed(connection, { type: "event", id: eventId }, { page: 1, limit: 2 });
    assert.equal(queryCount, 2, "detailed projection must use one scope check and one grouped query");
    assert.equal(detailed.sources.length, 2);
    assert.equal(detailed.claims.length, 2);
    const shared = detailed.claims.find((claim) => claim.key === `group:${sharedGroupId}`);
    assert.equal(shared.coverage, "shared");
    assert.deepEqual(shared.observations.map((item) => item.values[0].value), [10, 14]);
    assert.deepEqual(shared.observations.map((item) => item.values[0].unit), ["fő", "fő"]);
    assert.deepEqual(shared.observations.map((item) => item.attribution.type), ["police", "hospital"]);
    const page2 = await compareSourcesDetailed(connection, { type: "event", id: eventId }, { page: 2, limit: 2 });
    assert.equal(page2.claims.length, 1);
    assert.equal(new Set([...detailed.claims, ...page2.claims].map((claim) => claim.key)).size, 3);
    const emptyEvent = await connection.execute("INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,created_at,updated_at) VALUES ('topic',?,?, 'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`${suffix} empty`, `${suffix}-empty`]);
    const empty = await compareSourcesDetailed(connection, { type: "event", id: Number(emptyEvent[0].insertId) });
    assert.deepEqual(empty.claims, []); assert.deepEqual(empty.sources, []); assert.equal(empty.pagination.pages, 0);
    await assert.rejects(() => compareSourcesDetailed(connection, { type: "event", id: 999999999 }), /scope_not_found/);
    await assert.rejects(() => compareSourcesDetailed(connection, { type: "event", id: eventId }, { page: 0 }), /page_invalid/);
    await assert.rejects(() => compareSourcesDetailed(connection, { type: "event", id: eventId }, { limit: 101 }), /limit_invalid/);
    assert.equal(sharedA > 0 && sharedB > 0, true);
  } finally {
    if (eventId) await connection.execute("DELETE FROM v2_events WHERE id=?", [eventId]);
    if (claimIds.length) await connection.execute(`DELETE FROM v2_claim_evidence WHERE claim_id IN (${claimIds.map(() => "?").join(",")})`, claimIds);
    if (claimIds.length) await connection.execute(`DELETE FROM v2_claims WHERE id IN (${claimIds.map(() => "?").join(",")})`, claimIds);
    await connection.execute("DELETE FROM v2_claim_groups WHERE predicate LIKE ?", [`${suffix}%`]);
    if (articleIds.length) await connection.execute(`DELETE FROM articles WHERE id IN (${articleIds.map(() => "?").join(",")})`, articleIds);
    if (sourceIds.length) await connection.execute(`DELETE FROM sources WHERE id IN (${sourceIds.map(() => "?").join(",")})`, sourceIds);
    await connection.end();
  }
});

console.log("M15 MySQL source comparison regression: PASS");
