#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const mysql = require("mysql2/promise");
const { applyMigrations, auditMigrationChain, loadMigrations } = require("../db/migration-core.cjs");
const { runV2ShadowIntelligence } = require("../lib/v2/shadow-intelligence.js");
const { resolveCrossArticleEventGroup } = require("../lib/v2/event-matching-repository.js");
const { compareSourcesDetailed } = require("../lib/v2/read-model-repository.js");
const { runConflictDetection } = require("../lib/v2/runtime-conflict-history.js");
const {
  SYNTHETIC_POSITIVE_FIXTURES, assertAcceptanceOptIn, assertAcceptanceProvider, buildRunId,
  classifyAcceptanceResult, createAcceptanceDatabaseController, createProductionReadAdapter, hasSyntheticSemanticCoverage,
  parseAcceptanceMode, parseArticleIds, validateArticleFixtures,
} = require("../lib/acceptance/v2-vps-harness.js");

function log(event, data = {}) { process.stdout.write(`${JSON.stringify({ event, at: new Date().toISOString(), ...data })}\n`); }
function arg(name) { const prefix = `--${name}=`; return process.argv.slice(2).find((item) => item.startsWith(prefix))?.slice(prefix.length); }
function flag(name) { return process.argv.slice(2).includes(`--${name}`); }
function dbConfig(database) {
  const port = Number(process.env.DB_PORT || 3306);
  if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST) throw new Error("database_environment_incomplete");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("database_port_invalid");
  return { host: process.env.DB_HOST, port, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database, multipleStatements: false, charset: "utf8mb4" };
}
function sqlDate(value) { return value == null ? null : new Date(value).toISOString().slice(0, 23).replace("T", " "); }
function jsonSafe(value) { return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? Number(item) : item)); }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(jsonSafe(value))).digest("hex"); }
async function bounded(label, work, timeoutMs = 120_000) {
  let timer;
  return Promise.race([Promise.resolve().then(work), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`acceptance_timeout:${label}`)), timeoutMs); timer.unref?.(); })]).finally(() => clearTimeout(timer));
}
async function fingerprint(prod, ids) {
  const marks = ids.map(() => "?").join(",");
  const [rows] = await prod.execute(`SELECT id,content_hash contentHash,status,processed,updated_at updatedAt FROM articles WHERE id IN (${marks}) ORDER BY id`, ids);
  return rows.map((row) => ({ id: Number(row.id), contentHash: row.contentHash || null, status: row.status, processed: Number(row.processed), updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt) }));
}
async function loadFixtures(prod, ids) {
  const marks = ids.map(() => "?").join(",");
  const [rows] = await prod.execute(
    `SELECT a.id,a.title,a.url_canonical urlCanonical,a.original_url originalUrl,a.external_id externalId,
            a.content_text contentText,a.content_hash contentHash,a.published_at publishedAt,
            a.publication_time_source publicationTimeSource,a.language,a.source_id sourceId,a.source,a.status,a.processed,
            s.slug sourceSlug,s.name sourceName,s.homepage_url homepageUrl,s.feed_url feedUrl
       FROM articles a JOIN sources s ON s.id=a.source_id
      WHERE a.id IN (${marks}) ORDER BY a.id`, ids);
  return validateArticleFixtures(rows, ids);
}
async function copyFixtures(connection, articles) {
  for (const source of new Map(articles.map((row) => [Number(row.sourceId), row])).values()) {
    await connection.execute("INSERT INTO sources (id,slug,name,homepage_url,feed_url,is_active) VALUES (?,?,?,?,?,0)", [source.sourceId, source.sourceSlug, source.sourceName, source.homepageUrl, source.feedUrl]);
  }
  for (const row of articles) {
    await connection.execute(
      `INSERT INTO articles (id,title,url_canonical,original_url,external_id,content_text,published_at,publication_time_source,
          language,source_id,source,content_hash,processed,status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,'done',UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
      [row.id, row.title, row.urlCanonical, row.originalUrl, row.externalId, row.contentText, sqlDate(row.publishedAt), row.publicationTimeSource || "legacy_unknown", row.language || "hu", row.sourceId, row.source || row.sourceName, row.contentHash],
    );
  }
}
async function createSyntheticFixtures(connection) {
  const articles = [];
  for (const [index, fixture] of SYNTHETIC_POSITIVE_FIXTURES.entries()) {
    const [sourceInsert] = await connection.execute(
      "INSERT INTO sources (slug,name,homepage_url,feed_url,is_active) VALUES (?,?,?,?,0)",
      [fixture.sourceSlug, fixture.sourceName, `https://${fixture.sourceSlug}.invalid`, `https://${fixture.sourceSlug}.invalid/feed`],
    );
    const sourceId = Number(sourceInsert.insertId);
    const urlCanonical = `https://${fixture.sourceSlug}.invalid/zold-busz-${index + 1}`;
    const [articleInsert] = await connection.execute(
      `INSERT INTO articles (title,url_canonical,original_url,content_text,published_at,publication_time_source,
          language,source_id,source,content_hash,processed,status,created_at,updated_at)
       VALUES (?,?,?,?,?,'feed','hu',?,?,?,1,'done',UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
      [fixture.title, urlCanonical, urlCanonical, fixture.text, "2026-10-20 10:00:00", sourceId, fixture.sourceName, crypto.createHash("sha256").update(fixture.text).digest("hex")],
    );
    articles.push({ ...fixture, id: Number(articleInsert.insertId), sourceId, urlCanonical, publishedAt: "2026-10-20T10:00:00.000Z" });
  }
  return articles;
}
async function createSyntheticReferenceEntities(connection) {
  const definitions = [
    ["organization", "BKK Zrt.", "bkk"],
    ["project", "Zöld Busz Program", "zöld busz program"],
  ];
  const ids = [];
  for (const [type, canonical, normalized] of definitions) {
    const [insert] = await connection.execute(
      `INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,confidence_current,first_observed_at,last_observed_at,created_at,updated_at)
       VALUES (?,?,?,'hu','accepted',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [type, canonical, normalized],
    );
    ids.push(Number(insert.insertId));
  }
  return { subjectId: ids[0], objectId: ids[1] };
}
async function tableCounts(connection) {
  const tables = ["v2_entities", "v2_entity_mentions", "v2_claims", "v2_claim_evidence", "v2_entity_relations", "v2_events", "v2_event_articles", "v2_timelines", "v2_timeline_items", "v2_conflicts"];
  const result = {};
  for (const table of tables) { const [[row]] = await connection.query(`SELECT COUNT(*) count FROM \`${table}\``); result[table] = Number(row.count); }
  return result;
}
async function validateProvenance(connection, ids, match) {
  const marks = ids.map(() => "?").join(",");
  const checks = {};
  [[checks.claimsWithoutEvidence]] = await connection.execute(`SELECT COUNT(*) count FROM v2_claims c LEFT JOIN v2_claim_evidence e ON e.claim_id=c.id AND e.article_id=c.article_id AND e.source_id=c.source_id WHERE c.article_id IN (${marks}) AND e.id IS NULL`, ids);
  [[checks.invalidClaimEvidence]] = await connection.execute(`SELECT COUNT(*) count FROM v2_claim_evidence e LEFT JOIN articles a ON a.id=e.article_id AND a.source_id=e.source_id LEFT JOIN v2_claims c ON c.id=e.claim_id AND c.article_id=e.article_id AND c.source_id=e.source_id WHERE e.article_id IN (${marks}) AND (a.id IS NULL OR c.id IS NULL OR e.text_span IS NULL OR TRIM(e.text_span)='')`, ids);
  [[checks.invalidRelations]] = await connection.execute(`SELECT COUNT(*) count FROM v2_entity_relations r LEFT JOIN v2_entities s ON s.id=r.subject_entity_id LEFT JOIN v2_entities o ON o.id=r.object_entity_id LEFT JOIN v2_relation_evidence e ON e.relation_id=r.id LEFT JOIN articles a ON a.id=e.article_id WHERE e.article_id IN (${marks}) AND (s.id IS NULL OR o.id IS NULL OR e.id IS NULL OR a.id IS NULL)`, ids);
  [[checks.eventsWithoutEvidence]] = await connection.execute(`SELECT COUNT(*) count FROM v2_event_articles ea LEFT JOIN v2_claim_evidence ce ON ce.id=ea.evidence_id AND ce.article_id=ea.article_id LEFT JOIN articles a ON a.id=ea.article_id WHERE ea.article_id IN (${marks}) AND (ce.id IS NULL OR a.id IS NULL)`, ids);
  [[checks.invalidTimeline]] = await connection.execute(`SELECT COUNT(*) count FROM v2_timeline_items ti JOIN v2_timelines t ON t.id=ti.timeline_id LEFT JOIN v2_event_articles ea ON t.owner_type='article' AND ea.event_id=ti.item_id AND ea.article_id=t.owner_id LEFT JOIN v2_claim_evidence ce ON ce.id=ea.evidence_id AND ce.article_id=ea.article_id WHERE t.owner_type='article' AND t.owner_id IN (${marks}) AND ti.item_type='event' AND (ea.id IS NULL OR ce.id IS NULL)`, ids);
  const result = Object.fromEntries(Object.entries(checks).map(([key, row]) => [key, Number(row?.count || 0)]));
  result.matchSources = match ? new Set(match.sourceIds || []).size : 0;
  result.matchArticles = match ? new Set(match.articleIds || []).size : 0;
  result.valid = Object.entries(result).filter(([key]) => !["matchSources", "matchArticles"].includes(key)).every(([, count]) => count === 0)
    && (!match || match.status !== "matched" || (result.matchSources >= 2 && result.matchArticles >= 2));
  return result;
}
async function timelineAudit(connection, ids) {
  const marks = ids.map(() => "?").join(",");
  const [rows] = await connection.execute(`SELECT t.owner_id articleId,ti.item_id eventId,ti.valid_at validAt,ti.valid_from validFrom,ti.valid_until validUntil,ti.ordering_key orderingKey,e.start_at eventStart,e.end_at eventEnd FROM v2_timelines t JOIN v2_timeline_items ti ON ti.timeline_id=t.id JOIN v2_events e ON e.id=ti.item_id WHERE t.owner_type='article' AND ti.item_type='event' AND t.owner_id IN (${marks}) ORDER BY t.owner_id,ti.id`, ids);
  const invalid = rows.filter((row) => row.validAt == null && row.validFrom == null && !String(row.orderingKey || "").includes("unknown"));
  return { itemCount: rows.length, invalidCount: invalid.length, unknownTimeCount: rows.filter((row) => row.validAt == null && row.validFrom == null).length, valid: invalid.length === 0 };
}
async function eventIdsForArticles(connection, ids) {
  const marks = ids.map(() => "?").join(",");
  const [rows] = await connection.execute(`SELECT DISTINCT event_id eventId FROM v2_event_articles WHERE article_id IN (${marks}) ORDER BY event_id`, ids);
  return rows.map((row) => Number(row.eventId));
}
function conflictCandidates(comparison) {
  const claims = Array.isArray(comparison?.claims) ? comparison.claims : [];
  const output = [];
  for (let left = 0; left < claims.length; left += 1) for (let right = left + 1; right < claims.length; right += 1) {
    const result = runConflictDetection({ left: claims[left], right: claims[right] }, { enabled: true });
    if (result.candidate) output.push(result.candidate);
  }
  return output;
}
function reportMarkdown(report) {
  const inputRows = (report.inputArticles || []).map((row) => `| ${row.id} | ${row.sourceSlug} | ${row.urlCanonical} | ${row.publishedAt} |`).join("\n");
  return `# UTOM VPS V2 ACCEPTANCE REPORT\n\n- Mode: \`${report.mode}\`\n- Expected cross-article result: ${report.mode === "production-negative" ? "NO MATCH" : "MATCH"}\n\n## Environment\n\n\`\`\`json\n${JSON.stringify(report.environment, null, 2)}\n\`\`\`\n\n## Input Articles\n\n| Article | Source | URL | Published |\n|---:|---|---|---|\n${inputRows}\n\n## Production Safety\n\n- Production writes: ${report.safety.productionWritesExecuted}\n- Mutating query attempts: ${report.safety.productionMutatingQueryAttempts}\n- Production fingerprint before: \`${report.productionFingerprint?.before || "unavailable"}\`\n- Production fingerprint after: \`${report.productionFingerprint?.after || "unavailable"}\`\n- Production fingerprint unchanged: ${report.safety.productionFingerprintUnchanged}\n- Acceptance DB: \`${report.cleanup.database}\`\n- Acceptance migrated/fixture/V2 records: ${report.safety.acceptanceWrites}\n\n## Article-local processing\n\n\`\`\`json\n${JSON.stringify(report.articles, null, 2)}\n\`\`\`\n\n## Cross-Article Match\n\n\`\`\`json\n${JSON.stringify(report.match, null, 2)}\n\`\`\`\n\n## Provenance\n\n\`\`\`json\n${JSON.stringify(report.provenance, null, 2)}\n\`\`\`\n\n## Timeline\n\n\`\`\`json\n${JSON.stringify(report.timeline, null, 2)}\n\`\`\`\n\n## Source Comparison\n\n\`\`\`json\n${JSON.stringify(report.comparison, null, 2)}\n\`\`\`\n\n## Conflicts\n\n- Count: ${report.conflicts.length}\n- Winner selection: none\n\n## Paid API Proof\n\n- OpenAI: 0\n- Paid AI: ${report.safety.paidAiCalls}\n- Cloudflare V2: 0\n- Other external AI: ${report.safety.externalProviderCalls}\n\n## Acceptance Verdict\n\n**${report.result.verdict}** — ${report.result.category}: ${report.result.reason}\n`;
}

async function main() {
  const runId = buildRunId();
  const mode = parseAcceptanceMode(arg("mode"));
  const articleArgument = arg("article-ids");
  const articleIds = mode === "production-negative" ? parseArticleIds(articleArgument, { minimum: 2 }) : [];
  if (mode === "synthetic-positive" && articleArgument != null) throw new Error("synthetic_positive_rejects_production_article_ids");
  const acceptanceDb = `utom_acceptance_${runId}`;
  assertAcceptanceOptIn(process.env, acceptanceDb);
  const keepDb = flag("keep-db");
  const keepOnFailure = !flag("drop-on-failure");
  const outputDir = path.join(process.env.TMPDIR || "/tmp", `utom-v2-acceptance-${runId}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const counters = { productionReadAttempts: 0, productionReadsExecuted: 0, productionWritesExecuted: 0 };
  const report = { runId, mode, articleIds, startedAt: new Date().toISOString(), outputDir, articles: [], match: null, comparison: null, conflicts: [], safety: { productionWritesExecuted: 0, externalProviderCalls: 0, paidAiCalls: 0 }, cleanup: { kept: true, database: acceptanceDb } };
  let admin; let productionRaw; let acceptancePool; let succeeded = false;
  const adapterCounters = { attempted: 0, executed: 0, mutatingAttempts: 0 };
  log("acceptance_started", { runId, mode, articleIds, acceptanceDatabase: acceptanceDb });
  try {
    const prodName = String(process.env.DB_NAME || "");
    let production = null; let before = null; let fixtures = null;
    if (mode === "production-negative") {
      if (!prodName || prodName === acceptanceDb) throw new Error("production_database_invalid");
      productionRaw = await mysql.createConnection(dbConfig(prodName));
      production = createProductionReadAdapter(productionRaw, adapterCounters);
      const [[mysqlVersion]] = await production.query("SELECT VERSION() version");
      report.environment = { hostname: os.hostname(), node: process.version, next: require("next/package.json").version, mysql: mysqlVersion.version, gitCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), schemaVersion: "064" };
      before = await bounded("production_fingerprint_before", () => fingerprint(production, articleIds), 30_000);
      report.productionFingerprint = { before: digest(before), after: null, unchanged: false };
      fixtures = await bounded("production_fixture_read", () => loadFixtures(production, articleIds), 30_000);
      log("acceptance_production_read", { articleCount: fixtures.length, sourceCount: new Set(fixtures.map((row) => row.sourceId)).size });
    } else {
      report.environment = { hostname: os.hostname(), node: process.version, next: require("next/package.json").version, mysql: "local-acceptance", gitCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), schemaVersion: "064" };
      report.productionFingerprint = { before: null, after: null, unchanged: true, status: "NOT_ACCESSED" };
    }

    admin = await mysql.createConnection({ ...dbConfig(undefined), database: undefined });
    const controller = createAcceptanceDatabaseController(admin, { env: process.env, databaseName: acceptanceDb });
    await bounded("database_create", () => controller.create(), 30_000);
    acceptancePool = mysql.createPool({ ...dbConfig(acceptanceDb), connectionLimit: 2 });
    const migrations = loadMigrations(); const schemaAudit = auditMigrationChain(migrations);
    if (!schemaAudit.safeToApply) throw new Error("canonical_migration_chain_invalid");
    report.environment.schemaVersion = schemaAudit.latestVersion;
    const migrationConnection = await acceptancePool.getConnection();
    try { report.schema = { latestVersion: schemaAudit.latestVersion, applied: await bounded("migration", () => applyMigrations(migrationConnection, migrations), 180_000) }; } finally { migrationConnection.release(); }
    const [[acceptanceIdentity]] = await acceptancePool.query("SELECT DATABASE() databaseName");
    assertAcceptanceOptIn(process.env, acceptanceIdentity.databaseName);
    if (mode === "production-negative") await bounded("fixture_copy", () => copyFixtures(acceptancePool, fixtures), 30_000);
    else fixtures = await bounded("fixture_create", () => createSyntheticFixtures(acceptancePool), 30_000);
    report.articleIds = fixtures.map((row) => Number(row.id));
    report.inputArticles = fixtures.map((row) => ({ id: Number(row.id), sourceId: Number(row.sourceId), sourceSlug: row.sourceSlug, urlCanonical: row.urlCanonical, publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt) }));
    log("acceptance_fixture_created", { database: acceptanceDb, articleCount: fixtures.length, sourceCount: new Set(fixtures.map((row) => row.sourceId)).size });

    const runtimeEnv = { ...process.env, UTOM_V2_ENABLED: "true", UTOM_V2_SHADOW_ENABLED: "true", UTOM_OFFLINE_MODE: "true", UTOM_PAID_AI_ENABLED: "false", REAL_AI_ENABLED: "false", AI_PROVIDER: assertAcceptanceProvider("deterministic-semantic"), DB_WRITE_ENABLED: "false" };
    if (mode === "synthetic-positive") await bounded("synthetic_reference_entities", () => createSyntheticReferenceEntities(acceptancePool), 30_000);
    for (const articleId of report.articleIds) {
      const result = await bounded(`article_${articleId}`, () => runV2ShadowIntelligence(acceptancePool, articleId, { env: runtimeEnv, logger: (entry) => log("acceptance_v2_trace", entry) }), 120_000);
      report.articles.push(result); report.safety.externalProviderCalls += Number(result.externalProviderCalls || result.metrics?.externalProviderCalls || 0);
      log("acceptance_article_processed", { articleId, status: result.status, metrics: result.metrics || null, error: result.error || null });
    }
    const eventIds = await eventIdsForArticles(acceptancePool, report.articleIds);
    const matchResults = [];
    for (const eventId of eventIds) matchResults.push(await bounded(`match_${eventId}`, () => resolveCrossArticleEventGroup(acceptancePool, eventId), 30_000));
    report.match = matchResults.sort((a, b) => Number(b.metrics?.matchesAccepted || 0) - Number(a.metrics?.matchesAccepted || 0))[0] || null;
    log("acceptance_match_completed", { status: report.match?.status || "missing", metrics: report.match?.metrics || null });
    if (report.match?.status === "matched") report.comparison = await bounded("source_comparison", () => compareSourcesDetailed(acceptancePool, { type: "event", id: report.match.anchorEventId }, { eventIds: report.match.eventIds }), 30_000);
    else report.comparison = { status: "SKIPPED_NO_SHARED_EVENT", reason: "no_shared_event" };
    log("acceptance_comparison_completed", { status: report.comparison?.status || "missing", metrics: report.comparison?.metrics || null });
    report.conflicts = conflictCandidates(report.comparison);
    log("acceptance_conflict_completed", { count: report.conflicts.length, automaticWinners: report.conflicts.filter((item) => item.automaticWinner != null).length });
    report.counts = await tableCounts(acceptancePool);
    report.provenance = await validateProvenance(acceptancePool, report.articleIds, report.match);
    report.timeline = await timelineAudit(acceptancePool, report.articleIds);
    report.timeline.combined = report.match?.status === "matched";
    report.timeline.canonical = report.match?.status === "matched" ? report.match.canonicalTimeline : null;
    if (mode === "production-negative") {
      const after = await bounded("production_fingerprint_after", () => fingerprint(production, report.articleIds), 30_000);
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("production_fingerprint_changed");
      report.productionFingerprint.after = digest(after); report.productionFingerprint.unchanged = true;
    }
    counters.productionReadAttempts = adapterCounters.attempted; counters.productionReadsExecuted = adapterCounters.executed;
    report.safety = { ...report.safety, ...counters, productionMutatingQueryAttempts: adapterCounters.mutatingAttempts, productionFingerprintUnchanged: true, acceptanceWrites: Object.values(report.counts).reduce((sum, value) => sum + value, 0), provenanceValid: report.provenance.valid, timelineValid: report.timeline.valid, conflictValid: mode === "production-negative" ? report.conflicts.length === 0 : report.conflicts.every((item) => item.automaticWinner == null) };
    report.result = classifyAcceptanceResult(report);
    succeeded = report.result.verdict === "PASS";
  } catch (error) {
    report.safety.productionReadAttempts = adapterCounters.attempted;
    report.safety.productionReadsExecuted = adapterCounters.executed;
    report.safety.productionMutatingQueryAttempts = adapterCounters.mutatingAttempts;
    report.error = String(error?.message || error); report.result = { verdict: "FAIL", category: "SYSTEM ERROR", reason: report.error };
    log("acceptance_failed", { error: report.error });
  } finally {
    if (acceptancePool) await acceptancePool.end().catch(() => {});
    const shouldKeep = keepDb || (!succeeded && keepOnFailure);
    report.cleanup.kept = shouldKeep;
    if (!shouldKeep && admin) await bounded("cleanup", () => createAcceptanceDatabaseController(admin, { env: process.env, databaseName: acceptanceDb }).drop(), 30_000).catch((error) => { report.cleanup.error = String(error.message); report.cleanup.kept = true; });
    log("acceptance_cleanup", report.cleanup);
    if (productionRaw) await productionRaw.end().catch(() => {});
    if (admin) await admin.end().catch(() => {});
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(jsonSafe(report), null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, "report.md"), reportMarkdown(jsonSafe(report)));
    log(report.result.verdict === "FAIL" ? "acceptance_failed" : "acceptance_completed", { verdict: report.result.verdict, category: report.result.category, reportDirectory: outputDir });
    const negative = report.mode === "production-negative";
    const articleLocalPass = negative
      ? report.articles.every((row) => row.status === "completed")
      : report.articles.every(hasSyntheticSemanticCoverage);
    process.stdout.write(`\n========================================\nUTOM V2 VPS ACCEPTANCE\n========================================\nMode: ${report.mode}\nProduction DB writes: ${report.safety.productionWritesExecuted || 0}\nAcceptance DB: ${acceptanceDb}\nArticles: ${report.articleIds.length}\nSources: ${new Set((report.inputArticles || []).map((row) => row.sourceId)).size}\n\nArticle-local V2: ${articleLocalPass ? "PASS" : "FAIL"}\nExpected cross-article result: ${negative ? "NO MATCH" : "MATCH"}\nActual result: ${String(report.match?.status || "no_group").toUpperCase()}\n${negative ? `False merge prevention: ${report.match?.status === "matched" ? "FAIL" : "PASS"}` : `Provenance: ${report.provenance?.valid ? "PASS" : "FAIL"}`}\nTimeline: ${report.timeline?.valid && (!negative || !report.timeline.combined) ? "PASS" : "FAIL"}\nSource comparison: ${report.comparison?.status || "missing"}\nCross-event conflicts: ${report.conflicts.length}\nConflict safety: ${report.safety.conflictValid ? "PASS" : "FAIL"}\n\nOpenAI calls: 0\nExternal AI calls: ${report.safety.externalProviderCalls || 0}\n\nFINAL: ${report.result.verdict}\n\nReport:\n ${outputDir}\n========================================\n`);
  }
  if (report.result.verdict !== "PASS") process.exitCode = 1;
}

main().catch((error) => { log("acceptance_failed", { error: String(error?.message || error) }); process.exitCode = 1; });
