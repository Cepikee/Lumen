"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { buildTraceArticleBody } = require("../../scripts/dev-demo-bootstrap.cjs");
const { ingestFeedArticle } = require("../../lib/feed-ingestion.js");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope.js");
const { createMockEntityProvider } = require("../../lib/v2/entity-extraction-provider.js");
const { createMockRelationProvider } = require("../../lib/v2/relation-extraction-provider.js");
const { createMockClaimProvider } = require("../../lib/v2/claim-extraction-provider.js");
const { runEntityExtraction } = require("../../lib/v2/runtime-entity-extraction.js");
const { runEntityResolutionBatch } = require("../../lib/v2/runtime-entity-resolution.js");
const { runRelationExtraction } = require("../../lib/v2/runtime-relation-extraction.js");
const { runClaimExtraction } = require("../../lib/v2/runtime-claim-extraction.js");
const { runEventMatching } = require("../../lib/v2/runtime-event-matching.js");
const { runConflictDetection } = require("../../lib/v2/runtime-conflict-history.js");
const { persistConflict } = require("../../lib/v2/conflict-history-repository.js");
const { persistEntityExtraction } = require("../../lib/v2/entity-extraction-repository.js");
const { persistClaimsWithEvidence } = require("../../lib/v2/claim-extraction-repository.js");
const { persistEventCandidate } = require("../../lib/v2/event-matching-repository.js");
const { persistTimelineItem, readTimelineItems } = require("../../lib/v2/temporal-graph-repository.js");
const { persistDecision } = require("../../lib/v2/ai-cost-router-repository.js");
const { compareSources, compareSourcesDetailed, getClaim, getEvent } = require("../../lib/v2/read-model-repository.js");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/v21-intelligence-e2e/expected.json"), "utf8"));

function connect() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) && process.env.UTOM_TEST_ALLOW_PRIVATE_HOST !== "true") throw new Error("canonical_e2e_requires_loopback");
  if (!url.pathname || url.pathname === "/") throw new Error("canonical_e2e_requires_database");
  return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
}

async function resetDatabase(connection) {
  const [rows] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME <> 'schema_migrations'");
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  try {
    for (const row of rows) await connection.query(`DELETE FROM \`${String(row.TABLE_NAME).replace(/`/g, "``")}\``);
  } finally { await connection.query("SET FOREIGN_KEY_CHECKS=1"); }
}

function span(text, needle) {
  const start = text.indexOf(needle);
  if (start < 0) throw new Error(`fixture_span_missing:${needle}`);
  return { start, end: start + needle.length, textSpan: needle };
}

function words(text) { return text.trim().split(/\s+/u).filter(Boolean).length; }

function entityProvider() {
  return createMockEntityProvider({ resultFactory: ({ text }) => ({ entities: manifest.entities.map((entity) => ({ mentionText: entity.mention, normalizedCandidateName: entity.normalized, entityType: entity.type, confidence: 0.95, evidence: span(text, entity.mention) })) }) });
}

function claimProvider(variant) {
  return createMockClaimProvider({ resultFactory: ({ text }) => {
    const claims = [
      { predicate: "PROJECT_START", claimType: "temporal", value: "2026-10-18", normalizedValue: "2026-10-18", validFrom: "2026-10-18T00:00:00Z", confidence: 0.9, evidence: span(text, "október 18-án") },
      { predicate: "PROJECT_QUOTE", claimType: "text", claimText: "A lakók nem egy újabb ígéretet kérnek", normalizedValue: "A lakók nem egy újabb ígéretet kérnek", attributionType: "quoted", confidence: 0.88, evidence: span(text, "A lakók nem egy újabb ígéretet kérnek") },
      { predicate: "AUDIO_COLLECTION", claimType: "boolean", value: false, normalizedValue: "false", polarity: "negated", confidence: 0.94, evidence: span(text, "A szenzorok nem rögzítenek hangot vagy arcot") },
    ];
    const expected = manifest.sourceVariants[variant];
    if (expected.numericValue) claims.unshift({ predicate: "INVESTMENT_AMOUNT", claimType: "numeric", value: { value: Number(expected.numericValue), unit: "HUF" }, normalizedValue: expected.numericValue, confidence: 0.92, evidence: span(text, expected.numericEvidence) });
    return { claims };
  } });
}

test("V2.1 canonical raw article -> knowledge graph acceptance gate", { skip: !enabled }, async () => {
  const previousV2 = process.env.UTOM_V2_ENABLED;
  process.env.UTOM_V2_ENABLED = "true";
  const connection = await connect();
  const directHarness = fs.readFileSync(__filename, "utf8");
  assert.doesNotMatch(directHarness, /INSERT\s+INTO\s+v2_(entities|entity_aliases|entity_relations|relation_evidence|claims|claim_evidence|claim_groups|events|event_articles|event_entities|conflicts|timelines|timeline_items|confidence_history)\b/i);
  try {
    await applyMigrations(connection, loadMigrations());
    await resetDatabase(connection);
    const sources = ["telex.hu", "24.hu", "index.hu"];
    for (const source of sources) await connection.execute("INSERT INTO sources (slug,name,homepage_url,is_active) VALUES (?,?,?,1)", [source, source, `https://${source}`]);
    const [sourceRows] = await connection.query("SELECT id,slug FROM sources ORDER BY id");
    const sourceIds = Object.fromEntries(sourceRows.map((row) => [row.slug, Number(row.id)]));
    const articles = [];
    const before = {};
    for (const table of ["v2_entities", "v2_entity_mentions", "v2_entity_aliases", "v2_entity_relations", "v2_relation_evidence", "v2_claims", "v2_claim_evidence", "v2_claim_groups", "v2_events", "v2_event_articles", "v2_event_entities", "v2_conflicts", "v2_timelines", "v2_timeline_items", "v2_confidence_history"]) {
      const [[row]] = await connection.query(`SELECT COUNT(*) count FROM ${table}`);
      before[table] = Number(row.count);
    }
    assert.deepEqual(Object.values(before), Object.values(before).map(() => 0));

    for (const [variant, fixture] of manifest.sourceVariants.entries()) {
      const content = buildTraceArticleBody(fixture.variant);
      assert.ok(words(content) >= manifest.articleWordCount.min && words(content) <= manifest.articleWordCount.max);
      const raw = { originalUrl: fixture.url, title: `Tiszapart vízvédelmi program – ${fixture.key}`, content, source: fixture.key, publishedAt: "2026-10-04T08:00:00Z", ingestedAt: "2026-10-04T08:05:00Z" };
      const ingestion = await ingestFeedArticle(connection, raw);
      assert.equal(ingestion.outcome, "inserted");
      const articleId = Number(ingestion.articleId);
      const [articleRows] = await connection.execute("SELECT id,source_id sourceId,content_text content,published_at publishedAt FROM articles WHERE id=?", [articleId]);
      assert.equal(articleRows.length, 1);
      const article = articleRows[0];
      const envelope = createIngestionEnvelope(raw).envelope;
      assert.equal(envelope.article.contentText, content.replace(/\n\n+/gu, "\n"));

      const extracted = await runEntityExtraction(envelope, {}, { enabled: true, provider: entityProvider() });
      assert.equal(extracted.status, "completed");
      const entityRun = await persistEntityExtraction(connection, { articleId, envelope, outcome: extracted });
      assert.equal(entityRun.mentionCount, manifest.entities.length);
      const resolved = await runEntityResolutionBatch(connection, extracted, {
        enabled: true,
        language: "hu",
        persist: true,
        articleId,
        runId: entityRun.runId,
        mentionIds: entityRun.mentions.map((mention) => mention.id),
        context: { provisionalScopeKey: "canonical-e2e:tiszapart-program" },
      });
      assert.equal(resolved.results.every((item) => item.result.entityId > 0 && item.result.entityStatus === "unresolved"), true);
      const anchorId = Number(resolved.results[0].result.entityId);

      const relation = await runRelationExtraction({ text: content, articleId, sourceId: sourceIds[fixture.key] }, {}, { enabled: true, provider: createMockRelationProvider({ resultFactory: () => ({ relations: [] }) }) });
      assert.equal(relation.status, "completed");
      assert.equal(relation.result.relations.length, 0);

      const claims = await runClaimExtraction({ text: content, articleId, sourceId: sourceIds[fixture.key], extractionRunId: entityRun.runId }, {}, { enabled: true, provider: claimProvider(variant), defaultSubjectEntityId: anchorId });
      assert.equal(claims.status, "completed");
      const persistedClaims = await persistClaimsWithEvidence(connection, { claims: claims.result.claims, articleId, sourceId: sourceIds[fixture.key], extractionRunId: entityRun.runId, publicationTime: article.publishedAt, observedAt: new Date("2026-10-04T08:05:00Z") });
      assert.equal(persistedClaims.count, fixture.numericValue ? 4 : 3);
      articles.push({ fixture, articleId, sourceId: sourceIds[fixture.key], content, entityRunId: entityRun.runId, anchorId, claims: persistedClaims.claims });
    }

    const candidates = [];
    for (const article of articles) {
      const result = runEventMatching({ eventType: manifest.event.eventType, canonicalTitle: manifest.event.canonicalTitle, articleId: article.articleId, startAt: manifest.event.startAt, confidence: 0.9, membershipType: article.fixture.expectedMembership }, { enabled: true });
      assert.equal(result.status, "candidate");
      candidates.push(await persistEventCandidate(connection, result.candidate));
    }
    assert.equal(new Set(candidates.map((item) => item.eventId)).size, 1);
    const eventId = candidates[0].eventId;
    for (const [index, article] of articles.entries()) {
      await persistTimelineItem(connection, { ownerType: "event", ownerId: eventId, item: { itemType: "article", itemId: article.articleId, validAt: "2026-10-04T08:00:00Z", displayAt: "2026-10-04T08:00:00Z", confidence: 0.9, visibility: "public", orderingKey: String(index + 1).padStart(4, "0") } });
    }
    for (const article of articles) {
      const fingerprint = crypto.createHash("sha256").update(`${article.articleId}:canonical-e2e`).digest("hex");
      const decision = await persistDecision(connection, { articleId: article.articleId, step: "canonical-e2e", inputFingerprint: fingerprint, deterministicEligible: true, provider: "mock", budget: { limits: { dailyCost: 0, monthlyCost: 0, perArticleCost: 0, perStepCost: 0 }, usage: { dailyCost: 0, monthlyCost: 0, perArticleCost: 0, perStepCost: 0 }, nextCost: 0 } });
      assert.equal(decision.route, "deterministic");
    }

    const timeline = await readTimelineItems(connection, { ownerType: "event", ownerId: eventId, asOf: "2026-10-04T09:00:00Z", limit: 10, visibility: "public" });
    assert.equal(timeline.items.length, 3);
    const event = await getEvent(connection, eventId, { asOf: "2026-10-04T09:00:00Z" });
    assert.equal(event.articles.length, 3);
    const comparison = await compareSources(connection, { type: "event", id: eventId });
    assert.deepEqual(comparison.sources.map((source) => source.name).sort(), sources.slice().sort());
    const detailed = await compareSourcesDetailed(connection, { type: "event", id: eventId });
    assert.equal(detailed.claims.length, 4);
    assert.ok(detailed.claims.some((claim) => claim.coverage === "shared"));
    const numericComparison = detailed.claims.find((claim) => claim.predicate === "INVESTMENT_AMOUNT");
    assert.equal(numericComparison.observations.length, 2);
    const firstClaim = articles[0].claims[0];
    assert.ok(await getClaim(connection, firstClaim.claimId));
    const conflictAttempt = runConflictDetection({ left: { id: articles[0].claims[0].claimId, subjectEntityId: articles[0].anchorId, predicate: "INVESTMENT_AMOUNT", claimType: "numeric", value: { value: 120, unit: "HUF" }, normalizedValue: "120" }, right: { id: articles[1].claims[0].claimId, subjectEntityId: articles[1].anchorId, predicate: "INVESTMENT_AMOUNT", claimType: "numeric", value: { value: 150, unit: "HUF" }, normalizedValue: "150" } }, { enabled: true });
    assert.equal(conflictAttempt.status, "completed");
    assert.equal(conflictAttempt.candidate.automaticWinner, null);
    await persistConflict(connection, conflictAttempt.candidate);

    const [[mentionCount]] = await connection.query("SELECT COUNT(*) count FROM v2_entity_mentions");
    const [[claimCount]] = await connection.query("SELECT COUNT(*) count FROM v2_claims");
    const [[eventCount]] = await connection.query("SELECT COUNT(*) count FROM v2_events");
    const [[timelineCount]] = await connection.query("SELECT COUNT(*) count FROM v2_timeline_items");
    const [[conflictCount]] = await connection.query("SELECT COUNT(*) count FROM v2_conflicts");
    assert.equal(Number(mentionCount.count), 21);
    assert.equal(Number(claimCount.count), 11);
    assert.equal(Number(eventCount.count), 1);
    assert.equal(Number(timelineCount.count), 3);
    assert.equal(Number(conflictCount.count), 1);
    const [[entityCount]] = await connection.query("SELECT COUNT(*) count FROM v2_entities WHERE status='unresolved'");
    assert.equal(Number(entityCount.count), manifest.entities.length);

    const [evidenceRows] = await connection.query("SELECT ce.article_id articleId,ce.source_id sourceId,ce.text_span textSpan,ce.span_hash spanHash,a.content_text content FROM v2_claim_evidence ce JOIN articles a ON a.id=ce.article_id ORDER BY ce.id");
    assert.ok(evidenceRows.length > 0);
    for (const evidence of evidenceRows) {
      assert.ok(String(evidence.content).includes(String(evidence.textSpan)));
      assert.ok(Number(evidence.articleId) > 0 && Number(evidence.sourceId) > 0);
      const start = String(evidence.content).indexOf(String(evidence.textSpan));
      const end = start + String(evidence.textSpan).length;
      const expectedHash = crypto.createHash("sha256").update(JSON.stringify([Number(evidence.articleId), Number(evidence.sourceId), start, end, String(evidence.textSpan)])).digest("hex");
      assert.equal(evidence.spanHash, expectedHash);
    }
  } finally {
    await resetDatabase(connection).catch(() => {});
    await connection.end();
    if (previousV2 === undefined) delete process.env.UTOM_V2_ENABLED; else process.env.UTOM_V2_ENABLED = previousV2;
  }
});

console.log("V21 canonical intelligence E2E acceptance: PASS");
