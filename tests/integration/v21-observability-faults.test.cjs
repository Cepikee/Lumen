"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const mysql = require("mysql2/promise");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope.js");
const { createMockEntityProvider } = require("../../lib/v2/entity-extraction-provider.js");
const { createMockClaimProvider } = require("../../lib/v2/claim-extraction-provider.js");
const { runEntityExtraction } = require("../../lib/v2/runtime-entity-extraction.js");
const { runClaimExtraction } = require("../../lib/v2/runtime-claim-extraction.js");
const { getOperationalSnapshot } = require("../../lib/operations.js");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function config() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) };
}
function span(text, needle, startAt = 0) {
  const start = text.indexOf(needle, startAt);
  assert.ok(start >= 0, `missing fixture span ${needle}`);
  return { start, end: start + needle.length, textSpan: needle };
}
function generatedArticle(size) {
  const tokens = Array.from({ length: 100 }, (_, index) => `Entity-${String(index).padStart(3, "0")}`);
  const sentences = tokens.map((token, index) => `A ${token} szerepel a kontrollált helyi fixture ${index}.`);
  let content = sentences.join(" ");
  while (content.length < size) content += " Kontrollált tesztadat, amely nem valódi sajtócikk. ";
  return content.slice(0, Math.max(size, sentences.join(" ").length));
}

test("isolated MySQL SLEEP fixture measures latency, timeout and connection recovery", { skip: !enabled, timeout: 15_000 }, async () => {
  const connection = await mysql.createConnection(config());
  try {
    for (const delayMs of [100, 500, 2000]) {
      const started = Date.now();
      const [rows] = await connection.execute("SELECT SLEEP(?) AS sleep_result", [delayMs / 1000]);
      assert.equal(Number(rows[0].sleep_result), 0);
      assert.ok(Date.now() - started >= delayMs * 0.5);
    }
    const timeoutConnection = await mysql.createConnection(config());
    let timedOut = false;
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("fixture_timeout")), 100));
    try {
      await Promise.race([timeoutConnection.execute("SELECT SLEEP(2) AS sleep_result"), timeout]);
    } catch (error) {
      timedOut = error.message === "fixture_timeout";
    } finally {
      timeoutConnection.destroy();
    }
    assert.equal(timedOut, true);
    const [healthy] = await connection.execute("SELECT 1 AS alive");
    assert.equal(Number(healthy[0].alive), 1);
  } finally {
    await connection.end();
  }
});

test("generated large article and V2 parser fixture stay bounded", { skip: !enabled, timeout: 20_000 }, async () => {
  const measurements = [];
  for (const size of [10 * 1024, 50 * 1024, 100 * 1024, 250 * 1024]) {
    const content = generatedArticle(size);
    const raw = { originalUrl: `https://fixture.invalid/large-${size}`, title: `Kontrollált ${size}`, content, publishedAt: "2026-10-04T08:00:00Z" };
    const envelope = createIngestionEnvelope(raw).envelope;
    const entityProvider = createMockEntityProvider({ resultFactory: ({ text }) => ({ entities: Array.from({ length: 100 }, (_, index) => { const mentionText = `Entity-${String(index).padStart(3, "0")}`; const evidence = span(text, mentionText); return { mentionText, normalizedCandidateName: mentionText.toLowerCase(), entityType: "topic", confidence: 0.8, evidence: { start: evidence.start, end: evidence.end } }; }) }) });
    const claimProvider = createMockClaimProvider({ resultFactory: ({ text }) => ({ claims: Array.from({ length: 100 }, (_, index) => { const claimText = `Entity-${String(index).padStart(3, "0")}`; const evidence = span(text, claimText); return { predicate: `FACT_${index}`, claimType: "text", normalizedValue: claimText, confidence: 0.8, evidence }; }) }) });
    const started = Date.now();
    const before = process.memoryUsage().heapUsed;
    const entities = await runEntityExtraction(envelope, {}, { enabled: true, provider: entityProvider });
    const claims = await runClaimExtraction({ text: envelope.article.contentText, articleId: 1, sourceId: 1 }, {}, { enabled: true, provider: claimProvider });
    const durationMs = Date.now() - started;
    const memoryDelta = process.memoryUsage().heapUsed - before;
    assert.equal(entities.result.entities.length, 100);
    assert.equal(claims.result.claims.length, 100);
    assert.ok(durationMs < 5000);
    measurements.push({ size, durationMs, memoryDelta });
  }
  assert.equal(measurements.length, 4);
  console.log(JSON.stringify({ event: "large_v2_fixture", measurements }));
});



test("operational snapshot is read-only and exposes bounded diagnostics", { skip: !enabled, timeout: 15_000 }, async () => {
  const connection = await mysql.createConnection(config());
  try {
    const snapshot = await getOperationalSnapshot(connection);
    assert.equal(snapshot.liveness, true);
    assert.equal(typeof snapshot.readiness, "boolean");
    assert.equal(typeof snapshot.pipeline, "object");
    assert.equal(typeof snapshot.backfill, "object");
    assert.equal(typeof snapshot.rss, "object");
    assert.equal(typeof snapshot.rss.configured_sources, "number");
    assert.equal(typeof snapshot.entityQuality, "object");
    assert.equal(typeof snapshot.claimQuality, "object");
    assert.equal(typeof snapshot.v2, "object");
    assert.equal(typeof snapshot.aiBudget, "object");
    assert.equal(typeof snapshot.aiBudget.estimated_cost, "number");
    assert.doesNotMatch(JSON.stringify(snapshot), /DB_PASSWORD|Bearer|api[_-]?key/i);
  } finally {
    await connection.end();
  }
});
