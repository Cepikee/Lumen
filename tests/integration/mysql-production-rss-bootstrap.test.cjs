"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { SOURCES } = require("../../lib/source-identity");
const { bootstrapCanonicalSources } = require("../../scripts/bootstrap-production-sources.cjs");
const { ingestFeedArticle } = require("../../lib/feed-ingestion");
const { inspect } = require("../../scripts/inspect-feed-ingestion.cjs");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);

function config() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const database = url.pathname.slice(1);
  const allowedHost = ["127.0.0.1", "localhost", "::1"].includes(url.hostname) || process.env.UTOM_TEST_ALLOW_PRIVATE_HOST === "true";
  if (!allowedHost || !database.endsWith("_test")) throw new Error("rss_bootstrap_requires_disposable_test_database");
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

async function reset(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  const [tables] = await connection.query("SHOW TABLES");
  for (const row of tables) await connection.query(`DROP TABLE \`${String(Object.values(row)[0]).replace(/`/g, "``")}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
}

test("production RSS bootstrap and pending ingestion are idempotent on MySQL 8", { skip: !enabled }, async () => {
  const previousV2 = process.env.UTOM_V2_ENABLED;
  process.env.UTOM_V2_ENABLED = "false";
  const connection = await mysql.createConnection(config());
  try {
    await reset(connection);
    await applyMigrations(connection, loadMigrations());
    assert.equal((await bootstrapCanonicalSources(connection)).sources.length, 7);
    assert.equal((await bootstrapCanonicalSources(connection)).sources.length, 7);
    const [[sourceCount]] = await connection.query("SELECT COUNT(*) count,COUNT(DISTINCT slug) uniqueCount,SUM(is_active=1) activeCount FROM sources");
    assert.deepEqual([Number(sourceCount.count), Number(sourceCount.uniqueCount), Number(sourceCount.activeCount)], [7, 7, 7]);
    const [sourceRows] = await connection.query("SELECT slug,name,homepage_url homepageUrl,feed_url feedUrl FROM sources ORDER BY slug");
    for (const expected of SOURCES) {
      const actual = sourceRows.find((row) => row.slug === expected.key);
      assert.deepEqual(actual, { slug: expected.key, name: expected.displayName, homepageUrl: expected.homepageUrl, feedUrl: expected.feedUrl });
    }

    const article = { title: "RSS MySQL fixture", originalUrl: "https://telex.hu/belfold/mysql-rss-fixture?utm_source=rss", content: "Fixture", publishedAt: "2026-10-07T10:00:00Z", source: "Telex" };
    const first = await ingestFeedArticle(connection, article);
    const second = await ingestFeedArticle(connection, article);
    assert.equal(first.outcome, "inserted");
    assert.equal(second.outcome, "deduplicated");
    assert.equal(first.articleId, second.articleId);
    assert.equal("v2" in first, false);
    const [[stored]] = await connection.execute("SELECT status,source,source_id sourceId FROM articles WHERE id=?", [first.articleId]);
    assert.equal(stored.status, "pending");
    assert.equal(stored.source, "telex.hu");
    assert.ok(Number(stored.sourceId) > 0);
    const [[v2Rows]] = await connection.query("SELECT COUNT(*) count FROM v2_ingestion_provenance");
    assert.equal(Number(v2Rows.count), 0);
    const snapshot = await inspect(connection);
    assert.equal(snapshot.sourceCount, 7);
    assert.equal(snapshot.articleCount, 1);
    assert.equal(snapshot.pendingArticleCount, 1);
  } finally {
    await reset(connection).catch(() => {});
    await connection.end();
    if (previousV2 === undefined) delete process.env.UTOM_V2_ENABLED; else process.env.UTOM_V2_ENABLED = previousV2;
  }
});
