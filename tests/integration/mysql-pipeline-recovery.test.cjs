"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { createMysqlPipelineStore, createPipelineCoordinator } = require("../../pipeline/state-machine");
const { canonicalizeArticleUrl } = require("../../lib/article-identity");
const { speedHistoryEventKey } = require("../../pipeline/idempotency");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);

function safeConfig() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const database = url.pathname.slice(1);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !database.endsWith("_test")) {
    throw new Error("MySQL integration tests require a loopback database whose name ends in _test");
  }
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

async function resetDatabase(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  const [tables] = await connection.query("SHOW TABLES");
  for (const row of tables) await connection.query(`DROP TABLE \`${Object.values(row)[0]}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
}

function runClaimProcess(articleId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "mysql-claim-worker.cjs"), String(articleId)], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("exit", (code) => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr)));
  });
}

function runOperationProcess(mode, value, timezone = "UTC") {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "mysql-operation-worker.cjs"), mode, String(value)], {
      env: { ...process.env, TZ: timezone },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(stderr || stdout));
      const marker = "RESULT_JSON:";
      const offset = stdout.lastIndexOf(marker);
      return offset >= 0 ? resolve(JSON.parse(stdout.slice(offset + marker.length))) : reject(new Error(`missing result marker: ${stdout}`));
    });
  });
}

async function insertArticle(connection, suffix, status = "pending", extra = {}) {
  const [result] = await connection.execute(
    `INSERT INTO articles (title, url_canonical, content_text, published_at, source, status, embedding)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?)`,
    [`fixture-${suffix}`, `https://fixture.invalid/${suffix}`, "fixture content ".repeat(50), extra.source || "telex.hu", status, extra.embedding ? JSON.stringify(extra.embedding) : null],
  );
  return result.insertId;
}

test("MySQL 8 recovery integration and concurrency suite", { skip: !enabled }, async (t) => {
  const connection = await mysql.createConnection(safeConfig());
  try {
    const [[version]] = await connection.query("SELECT VERSION() AS version");
    assert.match(String(version.version), /^8\./);
    await resetDatabase(connection);
    const migrations = loadMigrations();
    const baseline = migrations.filter((migration) => Number(migration.version) <= 21);
    const recovery = migrations.filter((migration) => Number(migration.version) >= 22);
    assert.equal((await applyMigrations(connection, baseline)).length, baseline.length);

    const [source] = await connection.execute("INSERT INTO sources (slug, name, homepage_url) VALUES ('fixture', 'fixture', 'https://fixture.invalid')");
    const [cluster] = await connection.execute("INSERT INTO clusters (first_published_at, first_source) VALUES (UTC_TIMESTAMP(), 'fixture')");
    const fixtureStatuses = ["pending", "done", "failed"];
    for (let index = 0; index < fixtureStatuses.length; index++) {
      await connection.execute(
        "INSERT INTO articles (title, url_canonical, source_id, cluster_id, status) VALUES (?, ?, ?, ?, ?)",
        [`fixture-${index}`, `https://fixture.invalid/${index}`, source.insertId, cluster.insertId, fixtureStatuses[index]],
      );
    }
    await connection.execute("INSERT INTO summaries (article_id, content) VALUES (1, 'fixture')");
    await connection.execute("INSERT INTO keywords (article_id, keyword) VALUES (1, 'fixture')");
    await connection.execute("INSERT INTO trends (keyword, period) VALUES ('fixture', '7d')");
    await connection.execute("INSERT INTO speed_index_history (source, delay_minutes) VALUES ('fixture', 1)");

    assert.equal((await applyMigrations(connection, migrations)).length, recovery.length);
    assert.deepEqual(await applyMigrations(connection, migrations), []);

    await t.test("migration schema and representative data are preserved", async () => {
      const [columns] = await connection.query("SHOW COLUMNS FROM article_processing_steps");
      const columnNames = new Set(columns.map((column) => column.Field));
      for (const name of ["operation_key", "is_external", "external_started_at", "error_type", "retryable"]) assert.ok(columnNames.has(name));
      const [indexes] = await connection.query("SHOW INDEX FROM article_processing_steps");
      assert.ok(indexes.some((index) => index.Key_name === "uq_processing_steps_operation_key" && Number(index.Non_unique) === 0));
      const [statuses] = await connection.query("SELECT status FROM articles ORDER BY id");
      assert.deepEqual(statuses.map((row) => row.status), fixtureStatuses);
    });

    await t.test("two separate processes produce exactly one claim winner", async () => {
      for (let iteration = 0; iteration < 5; iteration++) {
        const articleId = await insertArticle(connection, `claim-${iteration}`);
        const [a, b] = await Promise.all([runClaimProcess(articleId), runClaimProcess(articleId)]);
        assert.equal([a, b].filter((result) => result.won).length, 1);
        const [[row]] = await connection.execute("SELECT processing_attempts, claim_token FROM articles WHERE id=?", [articleId]);
        assert.equal(row.processing_attempts, 1);
        assert.ok(row.claim_token);
      }
    });

    await t.test("active lease, stale recovery, and zombie fencing use real InnoDB", async () => {
      const articleId = await insertArticle(connection, "fencing");
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      const workerA = createPipelineCoordinator(store, { workerId: "worker-a", staleMs: 60_000 });
      const workerB = createPipelineCoordinator(store, { workerId: "worker-b", staleMs: 60_000 });
      try {
        const claimA = await workerA.claimArticle(articleId);
        assert.ok(claimA);
        assert.equal(await workerB.claimArticle(articleId), null);
        await store.claimStep({ ...claimA, stepName: "scrape", staleMs: 60_000 });
        await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 61 SECOND WHERE id=?", [articleId]);
        await connection.execute("UPDATE article_processing_steps SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 61 SECOND WHERE article_id=?", [articleId]);
        const claimB = await workerB.claimArticle(articleId);
        assert.ok(claimB);
        assert.notEqual(claimA.claimToken, claimB.claimToken);
        assert.equal(await store.heartbeatArticle(claimA), false);
        assert.equal((await store.claimStep({ ...claimA, stepName: "source", staleMs: 60_000 })).claimed, false);
        await assert.rejects(store.completeStep({ ...claimA, stepName: "scrape", status: "done", result: {} }), /step_claim_lost/);
        await assert.rejects(store.failStep({ ...claimA, stepName: "scrape", error: "zombie" }), /step_claim_lost/);
        await assert.rejects(store.failArticle({ ...claimA, stepName: "scrape", error: "zombie" }), /article_claim_lost/);
        await assert.rejects(store.completeArticle(claimA), /article_claim_lost/);
        const [scrapeWrite] = await connection.execute("UPDATE articles SET content_text='zombie' WHERE id=? AND worker_id=? AND claim_token=?", [articleId, claimA.workerId, claimA.claimToken]);
        assert.equal(scrapeWrite.affectedRows, 0);
        assert.equal(await store.heartbeatArticle(claimB), true);
        assert.equal((await store.claimStep({ ...claimB, stepName: "scrape", staleMs: 60_000 })).claimed, true);
      } finally {
        await pool.end();
      }
    });

    await t.test("external crash and DB-save failure remain uncertain without retry", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      try {
        for (const suffix of ["external-crash", "external-save-failure"]) {
          const articleId = await insertArticle(connection, suffix);
          const machine = createPipelineCoordinator(store, { workerId: suffix, staleMs: 60_000 });
          const claim = await machine.claimArticle(articleId);
          const stepName = suffix === "external-crash" ? "short_summary" : "embedding";
          const operationKey = suffix.padEnd(64, "0").slice(0, 64);
          await store.claimStep({ ...claim, stepName, staleMs: 60_000 });
          await store.beginExternalStep({ ...claim, stepName, operationKey });
          if (suffix === "external-save-failure") {
            await store.markExternalUncertain({ ...claim, stepName, operationKey, error: "injected DB save failure", errorType: "external_outcome_uncertain" });
          } else {
            await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 61 SECOND WHERE id=?", [articleId]);
            await store.quarantineStaleUncertain({ articleId, staleMs: 60_000 });
          }
          const [[article]] = await connection.execute("SELECT status FROM articles WHERE id=?", [articleId]);
          const [[step]] = await connection.execute("SELECT status, operation_key, retryable FROM article_processing_steps WHERE article_id=? AND step_name=?", [articleId, stepName]);
          assert.equal(article.status, "needs_recovery");
          assert.equal(step.status, "uncertain");
          assert.equal(step.operation_key, operationKey);
          assert.equal(step.retryable, 0);
          assert.equal(await machine.claimArticle(articleId), null);
        }
      } finally {
        await pool.end();
      }
    });

    await t.test("step result and done state roll back atomically", async () => {
      const articleId = await insertArticle(connection, "rollback", "in_progress");
      await connection.execute("UPDATE articles SET worker_id='tx', claim_token=UUID(), heartbeat_at=UTC_TIMESTAMP(6) WHERE id=?", [articleId]);
      await connection.execute("INSERT INTO article_processing_steps (article_id, step_name, status) VALUES (?, 'source', 'in_progress')", [articleId]);
      const tx = await mysql.createConnection(safeConfig());
      try {
        await tx.beginTransaction();
        await tx.execute("UPDATE article_processing_steps SET status='done', result_json=JSON_OBJECT('source','fixture') WHERE article_id=? AND step_name='source'", [articleId]);
        await tx.rollback();
      } finally { await tx.end(); }
      const [[step]] = await connection.execute("SELECT status, result_json FROM article_processing_steps WHERE article_id=? AND step_name='source'", [articleId]);
      assert.equal(step.status, "in_progress");
      assert.equal(step.result_json, null);
    });

    await t.test("concurrent feed, trend, and speed-history writes are idempotent", async () => {
      const canonical = canonicalizeArticleUrl("http://www.example.com/story/?utm_source=rss#top");
      const insertFeed = async () => {
        const conn = await mysql.createConnection(safeConfig());
        try { await conn.execute("INSERT IGNORE INTO articles (title,url_canonical,status) VALUES ('same title',?,'pending')", [canonical]); } finally { await conn.end(); }
      };
      await Promise.all([insertFeed(), insertFeed()]);
      const [[feedCount]] = await connection.execute("SELECT COUNT(*) count FROM articles WHERE url_canonical=?", [canonical]);
      assert.equal(Number(feedCount.count), 1);

      const articleId = await insertArticle(connection, "trend-speed");
      const upsertTrend = async (keyword) => {
        const conn = await mysql.createConnection(safeConfig());
        try { await conn.execute("INSERT INTO trends (article_id,keyword,period) VALUES (?,?,'7d') ON DUPLICATE KEY UPDATE frequency=VALUES(frequency)", [articleId, keyword]); } finally { await conn.end(); }
      };
      await Promise.all([upsertTrend("Gazdaság"), upsertTrend("gazdaság")]);
      const [[trendCount]] = await connection.execute("SELECT COUNT(*) count FROM trends WHERE article_id=? AND period='7d'", [articleId]);
      assert.equal(Number(trendCount.count), 1);

      const eventKey = speedHistoryEventKey(77, "telex.hu", 3.2);
      const insertHistory = async () => {
        const conn = await mysql.createConnection(safeConfig());
        try { await conn.execute("INSERT INTO speed_index_history (event_key,source,delay_minutes) VALUES (?,'telex.hu',3.2) ON DUPLICATE KEY UPDATE event_key=VALUES(event_key)", [eventKey]); } finally { await conn.end(); }
      };
      await Promise.all([insertHistory(), insertHistory()]);
      const [[historyCount]] = await connection.execute("SELECT COUNT(*) count FROM speed_index_history WHERE event_key=?", [eventKey]);
      assert.equal(Number(historyCount.count), 1);
    });

    await t.test("cluster advisory lock serializes two processes and releases cleanly", async () => {
      const embedding = Array.from({ length: 8 }, (_, index) => index / 10 + 0.1);
      const firstId = await insertArticle(connection, "cluster-a", "pending", { embedding, source: "telex.hu" });
      const secondId = await insertArticle(connection, "cluster-b", "pending", { embedding, source: "hvg.hu" });
      const [first, second] = await Promise.all([
        runOperationProcess("cluster", firstId, "UTC"),
        runOperationProcess("cluster", secondId, "Europe/Budapest"),
      ]);
      assert.equal(first.clusterId, second.clusterId);
      const [[clusterCount]] = await connection.execute("SELECT COUNT(DISTINCT cluster_id) count FROM articles WHERE id IN (?,?)", [firstId, secondId]);
      assert.equal(Number(clusterCount.count), 1);
      const [[lockState]] = await connection.execute("SELECT IS_FREE_LOCK('utom:cluster:utc-day:v1') free");
      assert.equal(lockState.free, 1);
    });

    await t.test("complete canonical pipeline reaches done with mocked external services", async () => {
      const articleId = await insertArticle(connection, "full-pipeline", "pending", { source: "telex.hu" });
      const result = await runOperationProcess("pipeline", articleId, "Europe/Budapest");
      assert.equal(result.article.status, "done");
      const states = new Map(result.steps.map((step) => [step.step_name, step.status]));
      const required = ["scrape", "short_summary", "long_summary", "plagiarism", "category", "title", "keywords", "trends", "source", "summary_persistence", "clickbait", "embedding", "cluster", "speed_index"];
      for (const step of required) assert.equal(states.get(step), "done", step);
      assert.ok(["done", "skipped"].includes(states.get("sentiment")));
      const [[domain]] = await connection.execute(
        `SELECT a.short_summary, a.long_summary, a.embedding, a.cluster_id, s.ai_clean, s.final_clickbait,
          (SELECT COUNT(*) FROM keywords k WHERE k.article_id=a.id) keyword_count,
          (SELECT COUNT(*) FROM trends t WHERE t.article_id=a.id) trend_count
         FROM articles a JOIN summaries s ON s.article_id=a.id WHERE a.id=?`,
        [articleId],
      );
      assert.ok(domain.short_summary);
      assert.ok(domain.long_summary);
      assert.ok(domain.embedding);
      assert.ok(domain.cluster_id);
      assert.equal(domain.ai_clean, 1);
      assert.notEqual(domain.final_clickbait, null);
      assert.ok(Number(domain.keyword_count) > 0);
      assert.ok(Number(domain.trend_count) > 0);
    });

    const [counts] = await connection.query("SELECT (SELECT COUNT(*) FROM summaries) summaries, (SELECT COUNT(*) FROM keywords) keywords");
    assert.ok(Number(counts[0].summaries) >= 1);
    assert.ok(Number(counts[0].keywords) >= 1);
  } finally {
    await resetDatabase(connection);
    await connection.end();
  }
});
