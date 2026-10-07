"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { SOURCES, sourceIdentityFromUrl } = require("../../lib/source-identity");
const { assertCapability, getRuntimeConfig } = require("../../lib/config/runtime");
const { isValidInternalToken } = require("../../lib/security/internal-token");
const { bootstrapCanonicalSources, assertSafeEnvironment } = require("../../scripts/bootstrap-production-sources.cjs");
const { buildRequest } = require("../../scripts/fetch-feed-once.cjs");
const { ingestFeedArticle } = require("../../lib/feed-ingestion");

const route = fs.readFileSync(path.join(__dirname, "../../app/api/fetch-feed/route.ts"), "utf8");

test("fetch-feed keeps worker auth and only requires feed plus database write", () => {
  assert.match(route, /export async function POST\(req: Request\)/);
  assert.match(route, /requireInternalWorker\(req\)/);
  assert.match(route, /blockedCapabilityResponse\(\[\s*"feedFetch",\s*"databaseWrite",?\s*\]\)/);
  assert.doesNotMatch(route, /blockedCapabilityResponse\(\[[\s\S]*?"realAi"/);
  assert.doesNotMatch(route, /openai|ai-client|processArticle/i);
  assert.match(route, /export async function GET\(\)[\s\S]*status: 405/);

  const safe = getRuntimeConfig({ UTOM_OFFLINE_MODE: "false", FEED_FETCH_ENABLED: "true", DB_WRITE_ENABLED: "true", AI_PROVIDER: "mock", REAL_AI_ENABLED: "false" });
  assert.equal(safe.capabilities.feedFetch, true);
  assert.equal(safe.capabilities.databaseWrite, true);
  assert.equal(safe.capabilities.realAi, false);
  const feedDisabled = getRuntimeConfig({ UTOM_OFFLINE_MODE: "false", FEED_FETCH_ENABLED: "false", DB_WRITE_ENABLED: "true" });
  const writesDisabled = getRuntimeConfig({ UTOM_OFFLINE_MODE: "false", FEED_FETCH_ENABLED: "true", DB_WRITE_ENABLED: "false" });
  assert.throws(() => assertCapability("feedFetch", feedDisabled), /feedFetch/);
  assert.throws(() => assertCapability("databaseWrite", writesDisabled), /databaseWrite/);
});

test("internal worker bearer authentication rejects unauthorized and accepts the configured token", () => {
  const token = "rss-worker-token-" + "x".repeat(32);
  assert.equal(isValidInternalToken(null, token), false);
  assert.equal(isValidInternalToken("Bearer wrong", token), false);
  assert.equal(isValidInternalToken(`Bearer ${token}`, token), true);
});

test("canonical source mapping has seven complete, unique production feed records", () => {
  assert.equal(SOURCES.length, 7);
  assert.equal(new Set(SOURCES.map((source) => source.key)).size, 7);
  assert.deepEqual(SOURCES.map((source) => source.key), ["telex.hu", "24.hu", "index.hu", "hvg.hu", "portfolio.hu", "444.hu", "origo.hu"]);
  for (const source of SOURCES) {
    assert.equal(sourceIdentityFromUrl(source.homepageUrl).key, source.key);
    assert.equal(new URL(source.feedUrl).protocol, "https:");
  }
});

function bootstrapDb() {
  const rows = new Map();
  return {
    rows,
    async execute(sql, values) {
      assert.match(sql, /ON DUPLICATE KEY UPDATE/);
      for (let index = 0; index < values.length; index += 4) {
        const [slug, name, homepageUrl, feedUrl] = values.slice(index, index + 4);
        const existing = rows.get(slug);
        rows.set(slug, { id: existing?.id || rows.size + 10, slug, name, homepageUrl, feedUrl, isActive: 1 });
      }
      return [{ affectedRows: SOURCES.length }, []];
    },
    async query(sql) {
      assert.match(sql, /WHERE slug IN/);
      return [[...rows.values()].sort((a, b) => a.slug.localeCompare(b.slug)), []];
    },
  };
}

test("source bootstrap is idempotent and keeps canonical rows active", async () => {
  const db = bootstrapDb();
  const first = await bootstrapCanonicalSources(db);
  const second = await bootstrapCanonicalSources(db);
  assert.equal(first.sources.length, 7);
  assert.equal(second.sources.length, 7);
  assert.equal(db.rows.size, 7);
  assert.ok(second.sources.every((source) => source.isActive === 1));
  assert.throws(() => assertSafeEnvironment({ UTOM_OFFLINE_MODE: "false", DB_WRITE_ENABLED: "false" }), /database_write/);
});

function ingestionDb() {
  let insertCount = 0;
  const article = { id: 71 };
  return {
    calls: [],
    async execute(sql, params) {
      this.calls.push({ sql, params });
      if (/SELECT id, is_active FROM sources/.test(sql)) return [[{ id: 12, is_active: 1 }], []];
      if (/INSERT IGNORE INTO articles/.test(sql)) return [insertCount++ === 0 ? { insertId: article.id, affectedRows: 1 } : { insertId: 0, affectedRows: 0 }, []];
      if (/SELECT id FROM articles/.test(sql)) return [[article], []];
      throw new Error(`unexpected_sql:${sql}`);
    },
  };
}

test("same URL deduplicates, new articles stay pending and V2 remains off", async () => {
  const previous = process.env.UTOM_V2_ENABLED;
  process.env.UTOM_V2_ENABLED = "false";
  try {
    const db = ingestionDb();
    const item = { title: "Production RSS fixture", originalUrl: "https://telex.hu/belfold/rss-fixture?utm_source=rss", content: "Tartalom", publishedAt: "2026-10-07T10:00:00Z", source: "Telex" };
    const first = await ingestFeedArticle(db, item);
    const second = await ingestFeedArticle(db, item);
    assert.equal(first.outcome, "inserted");
    assert.equal(second.outcome, "deduplicated");
    assert.equal(first.articleId, second.articleId);
    assert.equal("v2" in first, false);
    const insert = db.calls.find((call) => /INSERT IGNORE INTO articles/.test(call.sql));
    assert.match(insert.sql, /'pending'/);
  } finally {
    if (previous === undefined) delete process.env.UTOM_V2_ENABLED; else process.env.UTOM_V2_ENABLED = previous;
  }
});

test("one-shot command requires the safe no-AI production policy without exposing its token", () => {
  const env = { UTOM_INTERNAL_WORKER_TOKEN: "x".repeat(32), UTOM_INTERNAL_BASE_URL: "http://127.0.0.1:3011", UTOM_OFFLINE_MODE: "false", DB_WRITE_ENABLED: "true", FEED_FETCH_ENABLED: "true", REAL_AI_ENABLED: "false", UTOM_PAID_AI_ENABLED: "false", AI_PROVIDER: "mock", BACKGROUND_JOBS_ENABLED: "false", UTOM_V2_ENABLED: "false" };
  const request = buildRequest(env);
  assert.equal(request.url.href, "http://127.0.0.1:3011/api/fetch-feed");
  assert.throws(() => buildRequest({ ...env, REAL_AI_ENABLED: "true" }), /unsafe_real_ai_enabled/);
  const source = fs.readFileSync(path.join(__dirname, "../../scripts/fetch-feed-once.cjs"), "utf8");
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*request\.token/);
});
