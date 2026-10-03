"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ingestFeedArticle } = require("../../lib/feed-ingestion");

const baseItem = {
  originalUrl: "https://24.hu/hir/runtime-handoff?utm_source=rss&id=9",
  title: "Runtime cikk",
  content: "Tartalom",
  source: "24.hu",
  publishedAt: "2026-09-28T11:00:00+02:00",
  externalId: "runtime-9",
  language: "hu",
};

function connectionFor(...results) {
  let index = 0;
  return {
    async execute(sql) {
      assert.match(sql, /INSERT IGNORE INTO articles|SELECT id FROM articles|INSERT(?: IGNORE)? INTO v2_ingestion_provenance|SELECT id FROM v2_ingestion_provenance/);
      return [results[index++]];
    },
  };
}

test("V2-enabled ingestion hands off the canonical envelope without a DB write", async () => {
  const previous = {
    offline: process.env.UTOM_OFFLINE_MODE,
    v2: process.env.UTOM_V2_ENABLED,
  };
  process.env.UTOM_OFFLINE_MODE = "false";
  process.env.UTOM_V2_ENABLED = "true";
  try {
    const result = await ingestFeedArticle(
      connectionFor({ insertId: 41, affectedRows: 1 }, { insertId: 7, affectedRows: 1 }),
      baseItem,
    );
    assert.equal(result.outcome, "inserted");
    assert.equal(result.v2.envelope.outcome, "normalized");
    assert.equal(result.v2.envelope.envelope.article.canonicalUrl, "https://24.hu/hir/runtime-handoff?id=9");
    assert.equal(result.v2.envelope.envelope.source.key, "24.hu");
    assert.equal(result.v2.envelope.envelope.provenance.requestId.length, 36);
    assert.equal(result.v2.envelope.envelope.provenance.runId.length, 36);
    assert.equal(result.v2.persistence.outcome, "persisted");

    const retry = await ingestFeedArticle(
      connectionFor({ insertId: 0, affectedRows: 0 }, [{ id: 41 }], { insertId: 0, affectedRows: 0 }, [{ id: 7 }]),
      { ...baseItem, title: "Retry title" },
    );
    assert.equal(retry.outcome, "deduplicated");
    assert.equal(retry.articleId, 41);
    assert.equal(retry.v2.envelope.envelope.article.urlIdentity, result.v2.envelope.envelope.article.urlIdentity);
    assert.notEqual(retry.v2.envelope.envelope.provenance.runId, result.v2.envelope.envelope.provenance.runId);
  } finally {
    if (previous.offline === undefined) delete process.env.UTOM_OFFLINE_MODE;
    else process.env.UTOM_OFFLINE_MODE = previous.offline;
    if (previous.v2 === undefined) delete process.env.UTOM_V2_ENABLED;
    else process.env.UTOM_V2_ENABLED = previous.v2;
  }
});

test("V2-disabled ingestion preserves the legacy result shape and semantics", async () => {
  const previous = {
    offline: process.env.UTOM_OFFLINE_MODE,
    v2: process.env.UTOM_V2_ENABLED,
  };
  process.env.UTOM_OFFLINE_MODE = "false";
  process.env.UTOM_V2_ENABLED = "false";
  try {
    const result = await ingestFeedArticle(
      connectionFor({ insertId: 42, affectedRows: 1 }),
      baseItem,
    );
    assert.deepEqual(result, {
      outcome: "inserted",
      articleId: 42,
      canonicalUrl: "https://24.hu/hir/runtime-handoff?id=9",
      source: "24.hu",
      publicationTimeSource: "feed_explicit",
    });
  } finally {
    if (previous.offline === undefined) delete process.env.UTOM_OFFLINE_MODE;
    else process.env.UTOM_OFFLINE_MODE = previous.offline;
    if (previous.v2 === undefined) delete process.env.UTOM_V2_ENABLED;
    else process.env.UTOM_V2_ENABLED = previous.v2;
  }
});

test("malformed and unknown-source results remain legacy outcomes while V2 records explicit invalidity", async () => {
  const previous = {
    offline: process.env.UTOM_OFFLINE_MODE,
    v2: process.env.UTOM_V2_ENABLED,
  };
  process.env.UTOM_OFFLINE_MODE = "false";
  process.env.UTOM_V2_ENABLED = "true";
  try {
    const malformed = await ingestFeedArticle(connectionFor({ insertId: 8, affectedRows: 1 }), { ...baseItem, originalUrl: "bad" });
    assert.equal(malformed.outcome, "malformed_url");
    assert.equal(malformed.v2.envelope.outcome, "invalid");
    assert.equal(malformed.v2.persistence.outcome, "persisted");
    const unknown = await ingestFeedArticle(connectionFor(), { ...baseItem, originalUrl: "https://unknown.example/cikk", source: "unknown.example" });
    assert.equal(unknown.outcome, "unknown_source");
    assert.equal(unknown.v2.envelope.outcome, "normalized");
    assert.equal(unknown.v2.envelope.envelope.source, null);
    const missing = await ingestFeedArticle(connectionFor(), null);
    assert.equal(missing.outcome, "invalid_article");
    assert.equal(missing.v2.persistence.outcome, "skipped");
  } finally {
    if (previous.offline === undefined) delete process.env.UTOM_OFFLINE_MODE;
    else process.env.UTOM_OFFLINE_MODE = previous.offline;
    if (previous.v2 === undefined) delete process.env.UTOM_V2_ENABLED;
    else process.env.UTOM_V2_ENABLED = previous.v2;
  }
});

console.log("M2 runtime ingestion handoff: PASS");
