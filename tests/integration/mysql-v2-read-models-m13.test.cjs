"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { getEntity, getEvent, getClaim, compareSources, compareSourcesDetailed } = require("../../lib/v2/read-model-repository");
const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }

test("M13 MySQL read models project entity/event/claim/source comparison without writes", { skip: !enabled }, async () => {
  const connection = await connect(); const suffix = `${Date.now()}`;
  try {
    await applyMigrations(connection, loadMigrations());
    const [source] = await connection.execute("INSERT INTO sources (slug,name,is_active) VALUES (?,?,1)", [`m13-${suffix}`, "M13 Source"]);
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,source_id,source,status,published_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP())", ["M13", `https://m13.invalid/${suffix}`, source.insertId, "M13 Source", "done"]);
    const entityName = `M13 Entity ${suffix}`;
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES ('person',?,?, 'hu','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [entityName, entityName.toLowerCase()]);
    await connection.execute("INSERT INTO v2_entity_aliases (entity_id,alias,normalized_alias,language,alias_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [entity.insertId, "M13 Alias", "m13 alias", "hu", "observed", "review"]);
    const [event] = await connection.execute("INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,created_at,updated_at) VALUES ('topic','M13 Event',?, 'candidate',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`m13-${suffix}`]);
    await connection.execute("INSERT INTO v2_event_entities (event_id,entity_id,role,created_at) VALUES (?,?,?,UTC_TIMESTAMP(6))", [event.insertId, entity.insertId, "subject"]);
    await connection.execute("INSERT INTO v2_event_articles (event_id,article_id,membership_type,created_at) VALUES (?,?,?,UTC_TIMESTAMP(6))", [event.insertId, article.insertId, "observed"]);
    const [claim] = await connection.execute("INSERT INTO v2_claims (predicate,value_json,claim_type,article_id,source_id,observed_at,status,observation_key,created_at,updated_at) VALUES ('weight',?,?,?,?,UTC_TIMESTAMP(6),'observed',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [JSON.stringify({ value: 5, unit: "kg" }), "numeric", article.insertId, source.insertId, `m13-claim-${suffix}`]);
    await connection.execute("INSERT INTO v2_claim_evidence (claim_id,article_id,source_id,text_span,span_hash,evidence_type,support_type,created_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [claim.insertId, article.insertId, source.insertId, "five kg", "a".repeat(64), "quote", "supports"]);
    const projectedEntity = await getEntity(connection, entity.insertId, { timeline: false });
    const projectedEvent = await getEvent(connection, event.insertId);
    const projectedClaim = await getClaim(connection, claim.insertId);
    const compared = await compareSources(connection, { type: "claim", id: claim.insertId });
    const detailed = await compareSourcesDetailed(connection, { type: "claim", id: claim.insertId });
    assert.equal(projectedEntity.name, entityName); assert.equal(projectedEvent.articles.length, 1); assert.deepEqual(projectedClaim.value, { value: 5, unit: "kg" }); assert.equal(compared.sources.length, 1); assert.equal(detailed.claims.length, 1); assert.equal(detailed.authority.winner, null); assert.equal(detailed.ai.providerCalls, 0);
  } finally { await connection.end(); }
});

console.log("M13 MySQL read model regression: PASS");
