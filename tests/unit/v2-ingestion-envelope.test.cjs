"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");

const context = {
  requestId: "11111111-1111-4111-8111-111111111111",
  runId: "22222222-2222-4222-8222-222222222222",
};

test("creates deterministic, canonical, immutable provenance envelope", () => {
  const item = {
    originalUrl: "http://WWW.24.HU//hir/%7eteszt/?utm_source=rss&id=7#top",
    title: "  Árvíz\r\n\u200b Budapesten  ",
    content: " első sor \r\n\r\n második sor ",
    source: "TELEX",
    publishedAt: "2026-09-28T11:00:00+02:00",
    observedAt: "2026-09-28T09:30:00Z",
  };
  const first = createIngestionEnvelope(item, { context });
  const second = createIngestionEnvelope({ ...item }, { context });
  assert.equal(first.outcome, "normalized");
  assert.deepEqual(first.envelope, second.envelope);
  assert.equal(first.envelope.envelopeVersion, "v2.ingestion.1");
  assert.equal(first.envelope.article.canonicalUrl, "https://24.hu/hir/~teszt?id=7");
  assert.equal(first.envelope.article.title, "Árvíz\nBudapesten");
  assert.equal(first.envelope.article.contentText, "első sor\nmásodik sor");
  assert.equal(first.envelope.source.key, "24.hu");
  assert.equal(first.envelope.publication.occurredAt, "2026-09-28T09:00:00.000Z");
  assert.equal(first.envelope.observedAt, "2026-09-28T09:30:00.000Z");
  assert.equal(first.envelope.provenance.requestId, context.requestId);
  assert.equal(first.envelope.provenance.operationKey.length, 64);
  assert.equal(Object.isFrozen(first.envelope), true);
  assert.equal(Object.isFrozen(first.envelope.article), true);
  assert.equal(Object.isFrozen(first.envelope.provenance), true);
  assert.equal(JSON.stringify(first.envelope).includes("password"), false);
});

test("keeps unknown provenance explicit and rejects malformed article input", () => {
  const result = createIngestionEnvelope({
    originalUrl: "https://unknown.example/news",
    title: "  ",
    content: null,
    publishedAt: "not-a-date",
    observedAt: "also-invalid",
  });
  assert.equal(result.outcome, "normalized");
  assert.equal(result.envelope.source, null);
  assert.equal(result.envelope.publication.occurredAt, null);
  assert.equal(result.envelope.publication.source, null);
  assert.equal(result.envelope.observedAt, null);
  assert.equal(result.envelope.article.title, null);
  assert.equal(result.envelope.article.contentText, null);
  assert.deepEqual(createIngestionEnvelope({ originalUrl: "not a url" }), {
    outcome: "invalid",
    reason: "invalid_url",
    operationKey: "d8b5bf9b9fd4760c61234d12614d80c96892c75fe92d8819c6320f1ca6b3533d",
    envelope: null,
  });
  assert.deepEqual(createIngestionEnvelope(null), {
    outcome: "invalid",
    reason: "invalid_article",
    envelope: null,
  });
});

test("has no database, network, or AI side effects", () => {
  const result = createIngestionEnvelope({ originalUrl: "https://telex.hu/cikk", title: "Cím" });
  assert.equal(result.envelope.provenance.requestId, null);
  assert.equal(result.envelope.provenance.runId, null);
  assert.equal(Object.keys(result.envelope).some((key) => /secret|token|raw|password/i.test(key)), false);
});

test("does not accept an unvalidated provenance identity", () => {
  assert.throws(
    () => createIngestionEnvelope({ originalUrl: "https://telex.hu/cikk" }, { context: { requestId: "secret" } }),
    /UUID/,
  );
});

console.log("M2 ingestion provenance envelope: PASS");
