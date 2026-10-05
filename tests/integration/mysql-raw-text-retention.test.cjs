"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { REQUIRED_STEPS } = require("../../lib/raw-text-retention");
const { runRetentionBatch } = require("../../lib/raw-text-retention");
const { checkSchemaReadiness } = require("../../lib/operations");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function config() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const database = url.pathname.slice(1);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !database.endsWith("_test")) throw new Error("retention integration requires loopback _test DB");
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}
async function insertArticle(connection, suffix, status, updatedAt, content = "retained raw article body") {
  const [result] = await connection.execute(
    "INSERT INTO articles(title,url_canonical,content_text,content_hash,published_at,status,processing_attempts,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    [`retention-${suffix}`, `https://retention.invalid/${suffix}`, content, "a".repeat(64), updatedAt, status, status === "failed" ? 3 : 1, updatedAt],
  );
  return Number(result.insertId);
}
async function addDoneSteps(connection, articleId) {
  for (const step of REQUIRED_STEPS) await connection.execute("INSERT INTO article_processing_steps(article_id,step_name,status,retryable) VALUES (?,?,'done',0)", [articleId, step]);
}

test("MySQL raw-text retention lifecycle, rollback and duplicate workers", { skip: !enabled, timeout: 30_000 }, async () => {
  const connection = await mysql.createConnection(config());
  const pool = mysql.createPool({ ...config(), connectionLimit: 4 });
  try {
    assert.equal((await checkSchemaReadiness(connection)).ready, true);
    const now = new Date("2026-10-05T12:00:00Z");
    const young = await insertArticle(connection, "young", "done", "2026-10-05 00:00:00");
    await addDoneSteps(connection, young);
    const complete = await insertArticle(connection, "complete", "done", "2026-10-03 00:00:00");
    await addDoneSteps(connection, complete);
    await connection.execute("INSERT INTO summaries(article_id,content) VALUES (?,?)", [complete, "derived summary"]);
    const pending = await insertArticle(connection, "pending", "done", "2026-10-03 00:00:00");
    await addDoneSteps(connection, pending);
    await connection.execute("UPDATE article_processing_steps SET status='pending',retryable=1 WHERE article_id=? AND step_name='keywords'", [pending]);
    const failed = await insertArticle(connection, "failed", "failed", "2026-09-20 00:00:00");
    await connection.execute("INSERT INTO article_processing_steps(article_id,step_name,status,retryable,is_external) VALUES (?, 'short_summary','failed',0,0)", [failed]);
    const dry = await runRetentionBatch(pool, { dryRun: true, batchSize: 50, now, workerId: "retention-dry" });
    assert.equal(dry.wouldPurge, 2);
    const run = await runRetentionBatch(pool, { dryRun: false, batchSize: 50, now, workerId: "retention-a" });
    assert.equal(run.purgedCount, 2);
    const [[youngRow]] = await connection.execute("SELECT content_text FROM articles WHERE id=?", [young]);
    const [[completeRow]] = await connection.execute("SELECT content_text,content_hash,url_canonical FROM articles WHERE id=?", [complete]);
    assert.ok(youngRow.content_text);
    assert.equal(completeRow.content_text, null);
    assert.equal(completeRow.content_hash, "a".repeat(64));
    assert.match(completeRow.url_canonical, /retention\/complete/);
    const [[summary]] = await connection.execute("SELECT content FROM summaries WHERE article_id=?", [complete]);
    assert.equal(summary.content, "derived summary");
    const again = await runRetentionBatch(pool, { dryRun: false, batchSize: 50, now, workerId: "retention-b" });
    assert.equal(again.purgedCount, 0);
    const [[audit]] = await connection.execute("SELECT COUNT(*) purged FROM raw_text_retention_audit WHERE article_id=? AND action='purged'", [complete]);
    assert.equal(Number(audit.purged), 1);

    const rollbackId = await insertArticle(connection, "rollback", "done", "2026-10-03 00:00:00");
    await addDoneSteps(connection, rollbackId);
    const failingPool = {
      execute: (...args) => pool.execute(...args),
      async getConnection() {
        const tx = await pool.getConnection();
        const execute = tx.execute.bind(tx);
        tx.execute = async (sql, params) => { if (/UPDATE articles SET content_text=NULL/.test(sql)) throw Object.assign(new Error("injected_retention_failure"), { code: "ER_LOCK_DEADLOCK" }); return execute(sql, params); };
        return tx;
      },
    };
    const failedRun = await runRetentionBatch(failingPool, { dryRun: false, batchSize: 10, now, workerId: "retention-fault" });
    assert.equal(failedRun.failedCount, 1);
    const [[rollbackRow]] = await connection.execute("SELECT content_text FROM articles WHERE id=?", [rollbackId]);
    assert.ok(rollbackRow.content_text);
    await connection.execute("UPDATE articles SET status='needs_recovery' WHERE id=?", [rollbackId]);

    const concurrentId = await insertArticle(connection, "concurrent", "done", "2026-10-03 00:00:00");
    await addDoneSteps(connection, concurrentId);
    const [first, second] = await Promise.all([
      runRetentionBatch(pool, { dryRun: false, batchSize: 10, now, workerId: "retention-c1" }),
      runRetentionBatch(pool, { dryRun: false, batchSize: 10, now, workerId: "retention-c2" }),
    ]);
    assert.equal(first.purgedCount + second.purgedCount, 1);
  } finally {
    await pool.end();
    await connection.end();
  }
});
