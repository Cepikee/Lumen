"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { REQUIRED_STEPS, createMysqlPipelineStore, createPipelineCoordinator } = require("../../pipeline/state-machine");
const { canonicalizeArticleUrl } = require("../../lib/article-identity");
const { speedHistoryEventKey } = require("../../pipeline/idempotency");
const { updateSpeedIndex } = require("../../pipeline/updateSpeedIndex");
const { SPEED_INDEX_SCOPE, markSpeedIndexDirty, claimSpeedIndexBatch, runPendingSpeedIndexBatch } = require("../../pipeline/speedIndexBatch");
const { ingestFeedArticle } = require("../../lib/feed-ingestion");
const { checkSchemaReadiness, registerWorker, heartbeatWorker, stopWorker, getHealthSnapshot, inspectRecovery, retryRecovery } = require("../../lib/operations");
const { consumeRateLimit, consumeRateLimitFailClosed, cleanupExpiredRateLimits } = require("../../lib/shared-rate-limit");

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

function runClaimProcess(articleId, timezone = "UTC") {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "mysql-claim-worker.cjs"), String(articleId)], {
      env: { ...process.env, TZ: timezone },
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

function runIngestProcess(item, timezone = "UTC") {
  return runOperationProcess("ingest", Buffer.from(JSON.stringify(item)).toString("base64url"), timezone);
}

async function waitForWorkerRegistration(connection, workerId, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [rows] = await connection.execute("SELECT state FROM worker_runtime_health WHERE worker_id=?", [workerId]);
    if (rows[0]?.state === "running") return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("worker_registration_timeout");
}

function spawnPipelineWorker(workerId) {
  const config = safeConfig();
  return spawn(process.execPath, [path.join(__dirname, "mysql-lifecycle-worker.cjs")], {
    env: {
      ...process.env,
      DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_NAME: config.database,
      UTOM_OFFLINE_MODE: "false", BACKGROUND_JOBS_ENABLED: "true", FEED_FETCH_ENABLED: "false", AI_PROVIDER: "mock", UTOM_WORKER_ID: workerId,
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
}

function waitForExit(child, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("worker_exit_timeout")); }, timeoutMs);
    child.once("exit", (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
}

function runRateLimitProcess(identity, attempts, limit, windowMs, nowMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "mysql-rate-limit-worker.cjs"), identity, String(attempts), String(limit), String(windowMs), String(nowMs)], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("exit", (code) => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr || stdout)));
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
    await t.test("fresh MySQL 8 schema applies the complete migration chain without intervention", async () => {
      assert.equal((await applyMigrations(connection, migrations)).length, migrations.length);
      assert.deepEqual(await applyMigrations(connection, migrations), []);
      assert.deepEqual(await checkSchemaReadiness(connection), { ready: true, latestRequiredVersion: "033", missing: [] });
      const [[ledger]] = await connection.execute("SELECT COUNT(*) count,MAX(version) latest FROM schema_migrations");
      assert.equal(Number(ledger.count), migrations.length);
      assert.equal(ledger.latest, "033");
    });
    await resetDatabase(connection);
    await t.test("existing 032 schema upgrades to 033 without changing prior migration checksums", async () => {
      const through032 = migrations.filter((migration) => Number(migration.version) <= 32);
      assert.equal((await applyMigrations(connection, through032)).length, 32);
      const applied = await applyMigrations(connection, migrations);
      assert.deepEqual(applied, ["033_email_outbox.sql"]);
      const [[table]] = await connection.query("SELECT COUNT(*) count FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='email_outbox'");
      assert.equal(Number(table.count), 1);
    });
    await resetDatabase(connection);
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
      const [articleColumns] = await connection.query("SHOW COLUMNS FROM articles");
      const articleColumnNames = new Set(articleColumns.map((column) => column.Field));
      for (const name of ["original_url", "external_id", "publication_time_source", "url_identity"]) assert.ok(articleColumnNames.has(name));
      const [speedJobColumns] = await connection.query("SHOW COLUMNS FROM speed_index_recalculation_jobs");
      for (const name of ["generation", "completed_generation", "claimed_generation", "claim_token", "run_count"]) assert.ok(speedJobColumns.some((column) => column.Field === name));
      const [indexes] = await connection.query("SHOW INDEX FROM article_processing_steps");
      assert.ok(indexes.some((index) => index.Key_name === "uq_processing_steps_operation_key" && Number(index.Non_unique) === 0));
      const [articleIndexes] = await connection.query("SHOW INDEX FROM articles");
      const identityIndex = articleIndexes.find((index) => index.Key_name === "uq_articles_url_identity");
      assert.ok(identityIndex);
      assert.equal(identityIndex.Collation, "A");
      assert.equal(identityIndex.Sub_part, null);
      const [statuses] = await connection.query("SELECT status FROM articles ORDER BY id");
      assert.deepEqual(statuses.map((row) => row.status), fixtureStatuses);
      assert.deepEqual(await checkSchemaReadiness(connection), { ready: true, latestRequiredVersion: "033", missing: [] });
    });

    await t.test("schema readiness fails closed for a missing critical constraint", async () => {
      await connection.execute("ALTER TABLE speed_index_history DROP INDEX uq_speed_history_event_key");
      const mismatch = await checkSchemaReadiness(connection);
      assert.equal(mismatch.ready, false);
      assert.ok(mismatch.missing.includes("index:speed_index_history.uq_speed_history_event_key"));
      await connection.execute("ALTER TABLE speed_index_history ADD UNIQUE KEY uq_speed_history_event_key (event_key)");
      assert.equal((await checkSchemaReadiness(connection)).ready, true);
    });

    await t.test("worker health exposes ages and stale work without tokens or secrets", async () => {
      await Promise.all([registerWorker(connection, "health-worker-a"), registerWorker(connection, "health-worker-b")]);
      await heartbeatWorker(connection, "health-worker-a", "claim");
      await heartbeatWorker(connection, "health-worker-a", "completion");
      const staleId = await insertArticle(connection, "health-stale", "in_progress");
      await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 20 MINUTE,claimed_at=UTC_TIMESTAMP(6)-INTERVAL 20 MINUTE WHERE id=?", [staleId]);
      const recoveryId = await insertArticle(connection, "health-recovery", "needs_recovery");
      await connection.execute("UPDATE articles SET failed_step='short_summary',last_processing_error='external_operation_outcome_uncertain' WHERE id=?", [recoveryId]);
      await connection.execute("INSERT INTO speed_index_recalculation_jobs (scope_key,generation,completed_generation,status,heartbeat_at) VALUES ('health-stale',2,1,'in_progress',UTC_TIMESTAMP(6)-INTERVAL 20 MINUTE)");
      const snapshot = await getHealthSnapshot(connection, { ARTICLE_CLAIM_STALE_MS: "1000", SPEED_BATCH_STALE_MS: "1000", WORKER_UNHEALTHY_MS: "60000", BACKLOG_WARNING_MS: "1000" });
      assert.equal(snapshot.readiness, true);
      assert.equal(snapshot.status, "warning");
      assert.ok(Number(snapshot.articles.stale_count) >= 1);
      assert.ok(Number(snapshot.articles.needs_recovery_count) >= 1);
      assert.ok(Number(snapshot.speedIndex.stale_count) >= 1);
      assert.ok(snapshot.workers.last_article_claim_at);
      assert.equal(JSON.stringify(snapshot).includes("claim_token"), false);
      assert.equal(JSON.stringify(snapshot).includes("password"), false);
      await stopWorker(connection, "health-worker-a");
      await stopWorker(connection, "health-worker-b");
    });

    await t.test("recovery inspect is read-only, local retry is audited, and uncertain external work is protected", async () => {
      const localId = await insertArticle(connection, "recovery-local", "failed");
      await connection.execute("INSERT INTO article_processing_steps (article_id,step_name,status,is_external,retryable,last_error) VALUES (?,'cluster','failed',0,1,'db failure')", [localId]);
      const before = await inspectRecovery(connection, localId, 1_000);
      assert.equal(before.proposedAction, "safe_retry_available_for_retryable_local_step");
      const [[unchanged]] = await connection.execute("SELECT status FROM articles WHERE id=?", [localId]);
      assert.equal(unchanged.status, "failed");
      const retried = await retryRecovery(connection, localId, "cluster", "integration-test");
      assert.equal(retried.auditRecorded, true);
      const [[pending]] = await connection.execute("SELECT status FROM articles WHERE id=?", [localId]);
      const [[audit]] = await connection.execute("SELECT action,actor,previous_state,new_state FROM recovery_audit_log WHERE article_id=?", [localId]);
      assert.equal(pending.status, "pending");
      assert.deepEqual(audit, { action: "safe_retry", actor: "integration-test", previous_state: "failed", new_state: "pending" });

      const uncertainId = await insertArticle(connection, "recovery-uncertain", "needs_recovery");
      await connection.execute("INSERT INTO article_processing_steps (article_id,step_name,status,is_external,retryable,operation_key,error_type) VALUES (?,'short_summary','uncertain',1,0,REPEAT('a',64),'external_outcome_uncertain')", [uncertainId]);
      const uncertain = await inspectRecovery(connection, uncertainId);
      assert.equal(uncertain.proposedAction, "operator_adjudication_required");
      await assert.rejects(retryRecovery(connection, uncertainId, "short_summary", "integration-test"), /recovery_not_safe_retryable/);
      await assert.rejects(retryRecovery(connection, 0, "cluster"), /invalid_recovery_target/);
    });

    await t.test("canonical ingestion deduplicates retries and concurrent processes without resetting state", async () => {
      const base = {
        title: "Első cím",
        originalUrl: "http://WWW.24.HU//hir/%7eteszt/?utm_source=rss&id=7#top",
        content: "feed content",
        source: "24hu",
        publishedAt: "Sun, 27 Sep 2026 12:30:00 +0200",
        externalId: "shared-guid",
        language: "hu",
      };
      const [first, second] = await Promise.all([
        runIngestProcess(base, "UTC"),
        runIngestProcess({ ...base, title: "Később módosított cím", originalUrl: "https://24.hu/hir/~teszt?id=7&fbclid=x" }, "Europe/Budapest"),
      ]);
      assert.equal(first.articleId, second.articleId);
      assert.deepEqual([first.outcome, second.outcome].sort(), ["deduplicated", "inserted"]);
      const articleId = first.articleId;
      const [[count]] = await connection.execute("SELECT COUNT(*) count FROM articles WHERE url_identity=SHA2(?,256)", [first.canonicalUrl]);
      assert.equal(Number(count.count), 1);
      const [[initial]] = await connection.execute("SELECT title,source,DATE_FORMAT(published_at,'%Y-%m-%d %H:%i:%s') published_at,publication_time_source,original_url,status FROM articles WHERE id=?", [articleId]);
      assert.ok(["Első cím", "Később módosított cím"].includes(initial.title));
      assert.equal(initial.source, "24.hu");
      assert.equal(initial.publication_time_source, "feed_explicit");
      assert.equal(initial.published_at, "2026-09-27 10:30:00");
      assert.ok(initial.original_url);

      for (const preservedStatus of ["done", "needs_recovery", "in_progress", "failed"]) {
        await connection.execute("UPDATE articles SET status=?,processing_attempts=4,worker_id='preserve',claim_token=UUID() WHERE id=?", [preservedStatus, articleId]);
        const retry = await ingestFeedArticle(connection, { ...base, title: "Új feed cím", publishedAt: "2026-09-28T12:00:00Z" });
        assert.equal(retry.articleId, articleId);
        const [[preserved]] = await connection.execute("SELECT status,processing_attempts,title,DATE_FORMAT(published_at,'%Y-%m-%d %H:%i:%s') published_at FROM articles WHERE id=?", [articleId]);
        assert.equal(preserved.status, preservedStatus);
        assert.equal(preserved.processing_attempts, 4);
        assert.notEqual(preserved.title, "Új feed cím");
        assert.equal(preserved.published_at, "2026-09-27 10:30:00");
      }

      const different = await ingestFeedArticle(connection, { ...base, originalUrl: "https://24.hu/hir/masik?id=7", title: initial.title });
      assert.notEqual(different.articleId, articleId);
      const [[sameTitleCount]] = await connection.execute("SELECT COUNT(*) count FROM articles WHERE title=?", [initial.title]);
      assert.equal(Number(sameTitleCount.count), 2);

      const sameGuidOtherSource = await ingestFeedArticle(connection, {
        ...base,
        originalUrl: "https://telex.hu/hir/guid-collision",
        source: "telex.hu",
      });
      assert.notEqual(sameGuidOtherSource.articleId, articleId);
      const [[guidCount]] = await connection.execute("SELECT COUNT(*) count FROM articles WHERE external_id='shared-guid'");
      assert.equal(Number(guidCount.count), 3);

      const caseUpper = await ingestFeedArticle(connection, { ...base, originalUrl: "https://24.hu/Hir/Case" });
      const caseLower = await ingestFeedArticle(connection, { ...base, originalUrl: "https://24.hu/hir/case" });
      assert.notEqual(caseUpper.articleId, caseLower.articleId);
      const longPrefix = "a".repeat(750);
      const longA = await ingestFeedArticle(connection, { ...base, originalUrl: `https://24.hu/${longPrefix}A` });
      const longB = await ingestFeedArticle(connection, { ...base, originalUrl: `https://24.hu/${longPrefix}B` });
      assert.notEqual(longA.articleId, longB.articleId);

      const fallback = await ingestFeedArticle(connection, {
        ...base,
        originalUrl: "https://24.hu/hir/invalid-date",
        publishedAt: "not-a-date",
        ingestedAt: "2026-09-28T08:00:00Z",
      });
      const [[fallbackRow]] = await connection.execute(
        "SELECT publication_time_source,DATE_FORMAT(published_at,'%Y-%m-%d %H:%i:%s') published_at FROM articles WHERE id=?",
        [fallback.articleId],
      );
      assert.equal(fallbackRow.publication_time_source, "ingested_at_fallback");
      assert.equal(fallbackRow.published_at, "2026-09-28 08:00:00");
    });

    await t.test("two separate processes produce exactly one claim winner", async () => {
      for (let iteration = 0; iteration < 10; iteration++) {
        const articleId = await insertArticle(connection, `claim-${iteration}`);
        const [a, b] = await Promise.all([
          runClaimProcess(articleId, "UTC"),
          runClaimProcess(articleId, "Europe/Budapest"),
        ]);
        assert.equal([a, b].filter((result) => result.won).length, 1);
        const [[row]] = await connection.execute("SELECT processing_attempts, claim_token FROM articles WHERE id=?", [articleId]);
        assert.equal(row.processing_attempts, 1);
        assert.ok(row.claim_token);
      }
    });

    await t.test("lease timestamps and stale decisions use database UTC across worker timezones", async () => {
      const articleId = await insertArticle(connection, "timezone");
      const claim = await runClaimProcess(articleId, "Pacific/Honolulu");
      assert.equal(claim.won, true);
      const [[fresh]] = await connection.execute(
        `SELECT TIMESTAMPDIFF(MICROSECOND, heartbeat_at, UTC_TIMESTAMP(6)) age_us,
          heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL 60 SECOND stale
         FROM articles WHERE id=?`,
        [articleId],
      );
      assert.ok(Math.abs(Number(fresh.age_us)) < 5_000_000);
      assert.equal(Number(fresh.stale), 0);
      await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 61 SECOND WHERE id=?", [articleId]);
      const [[expired]] = await connection.execute(
        "SELECT heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL 60 SECOND stale FROM articles WHERE id=?",
        [articleId],
      );
      assert.equal(Number(expired.stale), 1);
    });

    await t.test("active lease, stale recovery, and zombie fencing use real InnoDB", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      try {
        for (let iteration = 0; iteration < 10; iteration++) {
          const articleId = await insertArticle(connection, `fencing-${iteration}`);
          const workerA = createPipelineCoordinator(store, { workerId: `worker-a-${iteration}`, staleMs: 60_000 });
          const workerB = createPipelineCoordinator(store, { workerId: `worker-b-${iteration}`, staleMs: 60_000 });
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
        }
      } finally {
        await pool.end();
      }
    });

    await t.test("external crash and DB-save failure remain uncertain without retry", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      try {
        const providerCalls = { short_summary: 0, embedding: 0 };
        for (const suffix of ["external-crash", "external-save-failure"]) {
          const articleId = await insertArticle(connection, suffix);
          const machine = createPipelineCoordinator(store, { workerId: suffix, staleMs: 60_000 });
          const claim = await machine.claimArticle(articleId);
          const stepName = suffix === "external-crash" ? "short_summary" : "embedding";
          const operationKey = suffix.padEnd(64, "0").slice(0, 64);
          if (suffix === "external-save-failure") {
            await assert.rejects(
              machine.runStep(claim, stepName, async () => {
                providerCalls[stepName]++;
                throw new Error("injected DB save failure after mock response");
              }, { external: true, operationKey }),
              /external_operation_uncertain/,
            );
          } else {
            await store.claimStep({ ...claim, stepName, staleMs: 60_000 });
            await store.beginExternalStep({ ...claim, stepName, operationKey });
            providerCalls[stepName]++;
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
          assert.equal(providerCalls[stepName], 1);
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

    await t.test("domain projections and fenced completion commit or roll back together", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      try {
        const successId = await insertArticle(connection, "projection-success");
        const successWorker = createPipelineCoordinator(store, { workerId: "projection-success", staleMs: 1_000 });
        const successClaim = await successWorker.claimArticle(successId);
        await store.claimStep({ ...successClaim, stepName: "short_summary", staleMs: 1_000 });
        let projectionConnectionId;
        await store.completeStepWithProjection({
          ...successClaim,
          stepName: "short_summary",
          status: "done",
          result: { summary: "atomic" },
          project: async (tx) => {
            const [[id]] = await tx.query("SELECT CONNECTION_ID() id");
            projectionConnectionId = Number(id.id);
            await tx.execute("INSERT INTO summaries (article_id,content) VALUES (?,?)", [successId, "atomic"]);
          },
          beforeComplete: async (tx) => {
            const [[id]] = await tx.query("SELECT CONNECTION_ID() id");
            assert.equal(Number(id.id), projectionConnectionId);
          },
        });
        const [[successDomain]] = await connection.execute("SELECT content FROM summaries WHERE article_id=?", [successId]);
        const [[successStep]] = await connection.execute("SELECT status FROM article_processing_steps WHERE article_id=? AND step_name='short_summary'", [successId]);
        assert.equal(successDomain.content, "atomic");
        assert.equal(successStep.status, "done");

        const afterWriteId = await insertArticle(connection, "projection-throw");
        const afterWriteWorker = createPipelineCoordinator(store, { workerId: "projection-throw", staleMs: 1_000 });
        const afterWriteClaim = await afterWriteWorker.claimArticle(afterWriteId);
        await store.claimStep({ ...afterWriteClaim, stepName: "short_summary", staleMs: 1_000 });
        await assert.rejects(store.completeStepWithProjection({
          ...afterWriteClaim,
          stepName: "short_summary",
          status: "done",
          result: {},
          project: async (tx) => {
            await tx.execute("INSERT INTO summaries (article_id,content) VALUES (?,?)", [afterWriteId, "must-rollback"]);
            throw new Error("injected_after_domain_write");
          },
        }), /injected_after_domain_write/);
        const [[afterWriteCount]] = await connection.execute("SELECT COUNT(*) count FROM summaries WHERE article_id=?", [afterWriteId]);
        assert.equal(Number(afterWriteCount.count), 0);

        const completionFailureId = await insertArticle(connection, "completion-failure");
        const completionWorker = createPipelineCoordinator(store, { workerId: "completion-failure", staleMs: 1_000 });
        const completionClaim = await completionWorker.claimArticle(completionFailureId);
        await store.claimStep({ ...completionClaim, stepName: "embedding", staleMs: 1_000 });
        await assert.rejects(store.completeStepWithProjection({
          ...completionClaim,
          stepName: "embedding",
          status: "x".repeat(100),
          result: {},
          project: (tx) => tx.execute("UPDATE articles SET embedding=? WHERE id=?", [JSON.stringify([0.1, 0.2]), completionFailureId]),
        }), /Data too long/);
        const [[failedEmbedding]] = await connection.execute("SELECT embedding FROM articles WHERE id=?", [completionFailureId]);
        assert.equal(failedEmbedding.embedding, null);

        const takeoverId = await insertArticle(connection, "projection-takeover");
        const workerA = createPipelineCoordinator(store, { workerId: "projection-a", staleMs: 1_000 });
        const workerB = createPipelineCoordinator(store, { workerId: "projection-b", staleMs: 1_000 });
        const claimA = await workerA.claimArticle(takeoverId);
        await store.claimStep({ ...claimA, stepName: "trends", staleMs: 1_000 });
        await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE id=?", [takeoverId]);
        await connection.execute("UPDATE article_processing_steps SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE article_id=?", [takeoverId]);
        const claimB = await workerB.claimArticle(takeoverId);
        assert.ok(claimB);
        let zombieProjectionRan = false;
        await assert.rejects(store.completeStepWithProjection({
          ...claimA,
          stepName: "trends",
          status: "done",
          result: {},
          project: async (tx) => {
            zombieProjectionRan = true;
            await tx.execute("INSERT INTO keywords (article_id,keyword) VALUES (?,?)", [takeoverId, "zombie"]);
          },
        }), /article_claim_lost/);
        assert.equal(zombieProjectionRan, false);
        const [[zombieDomain]] = await connection.execute("SELECT COUNT(*) count FROM keywords WHERE article_id=?", [takeoverId]);
        assert.equal(Number(zombieDomain.count), 0);
        const [[owner]] = await connection.execute("SELECT worker_id,claim_token FROM articles WHERE id=?", [takeoverId]);
        assert.equal(owner.worker_id, claimB.workerId);
        assert.equal(owner.claim_token, claimB.claimToken);
      } finally {
        await pool.end();
      }
    });

    await t.test("late AI result after claim loss cannot persist and remains recoverable", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      try {
        const articleId = await insertArticle(connection, "late-ai-result");
        const machine = createPipelineCoordinator(store, { workerId: "late-ai", staleMs: 1_000 });
        const claim = await machine.claimArticle(articleId);
        await store.claimStep({ ...claim, stepName: "short_summary", staleMs: 1_000 });
        await store.beginExternalStep({ ...claim, stepName: "short_summary", operationKey: "late-ai".padEnd(64, "0") });
        const providerCalls = 1;
        await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE id=?", [articleId]);
        await store.quarantineStaleUncertain({ articleId, staleMs: 1_000 });
        await assert.rejects(store.completeStepWithProjection({
          ...claim,
          stepName: "short_summary",
          status: "done",
          result: { summary: "late" },
          project: (tx) => tx.execute("INSERT INTO summaries (article_id,content) VALUES (?,?)", [articleId, "late"]),
        }), /article_claim_lost/);
        const [[domain]] = await connection.execute("SELECT COUNT(*) count FROM summaries WHERE article_id=?", [articleId]);
        const [[article]] = await connection.execute("SELECT status FROM articles WHERE id=?", [articleId]);
        const [[step]] = await connection.execute("SELECT status FROM article_processing_steps WHERE article_id=? AND step_name='short_summary'", [articleId]);
        assert.equal(Number(domain.count), 0);
        assert.equal(article.status, "needs_recovery");
        assert.equal(step.status, "uncertain");
        assert.equal(providerCalls, 1);
      } finally { await pool.end(); }
    });

    await t.test("local failure is retryable and final-completion crash reuses all done steps", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const store = createMysqlPipelineStore(pool);
      try {
        const localId = await insertArticle(connection, "local-retry");
        const first = createPipelineCoordinator(store, { workerId: "local-a", staleMs: 1_000 });
        const firstClaim = await first.claimArticle(localId);
        await assert.rejects(first.runStep(firstClaim, "plagiarism", async () => { throw new Error("injected local failure"); }), /injected local failure/);
        const [[failed]] = await connection.execute("SELECT status FROM articles WHERE id=?", [localId]);
        assert.equal(failed.status, "failed");
        await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE id=?", [localId]);
        const second = createPipelineCoordinator(store, { workerId: "local-b", staleMs: 1_000 });
        const secondClaim = await second.claimArticle(localId);
        assert.ok(secondClaim);
        await second.runStep(secondClaim, "plagiarism", async () => ({ score: 0.1 }));

        const finalId = await insertArticle(connection, "final-completion");
        const beforeCrash = createPipelineCoordinator(store, { workerId: "final-a", staleMs: 1_000 });
        const oldClaim = await beforeCrash.claimArticle(finalId);
        for (const stepName of REQUIRED_STEPS) {
          await connection.execute(
            "INSERT INTO article_processing_steps (article_id,step_name,status,worker_id,claim_token,result_json,completed_at) VALUES (?,?,'done',?,?,JSON_OBJECT('fixture',true),UTC_TIMESTAMP(6))",
            [finalId, stepName, oldClaim.workerId, oldClaim.claimToken],
          );
        }
        await connection.execute(
          "INSERT INTO article_processing_steps (article_id,step_name,status,worker_id,claim_token,result_json,completed_at) VALUES (?,'sentiment','skipped',?,?,JSON_OBJECT('fixture',true),UTC_TIMESTAMP(6))",
          [finalId, oldClaim.workerId, oldClaim.claimToken],
        );
        await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE id=?", [finalId]);
        const afterCrash = createPipelineCoordinator(store, { workerId: "final-b", staleMs: 1_000 });
        const newClaim = await afterCrash.claimArticle(finalId);
        assert.ok(newClaim);
        await afterCrash.finishArticle(newClaim);
        const [[done]] = await connection.execute("SELECT status,processing_attempts FROM articles WHERE id=?", [finalId]);
        assert.equal(done.status, "done");
        assert.equal(done.processing_attempts, 2);
      } finally { await pool.end(); }
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

    await t.test("source aliases share one Speed Index identity", async () => {
      const [cluster] = await connection.execute(
        "INSERT INTO clusters (first_published_at,first_source,title) VALUES (UTC_TIMESTAMP(),'telex.hu','alias-speed')",
      );
      await connection.execute(
        `INSERT INTO articles (title,url_canonical,content_text,published_at,source,status,cluster_id)
         VALUES ('speed-first',?,REPEAT('x',500),UTC_TIMESTAMP()-INTERVAL 10 MINUTE,'telex.hu','done',?),
                ('speed-alias',?,REPEAT('x',500),UTC_TIMESTAMP(),'24hu','done',?)`,
        [`https://fixture.invalid/speed-first-${cluster.insertId}`, cluster.insertId, `https://fixture.invalid/speed-alias-${cluster.insertId}`, cluster.insertId],
      );
      await updateSpeedIndex({ connection, strict: true });
      const [[canonical]] = await connection.execute("SELECT COUNT(*) count FROM speed_index WHERE source='24.hu'");
      const [[alias]] = await connection.execute("SELECT COUNT(*) count FROM speed_index WHERE source='24hu'");
      assert.equal(Number(canonical.count), 1);
      assert.equal(Number(alias.count), 0);
    });

    await t.test("Speed Index dirty marks coalesce under a 100-event concurrent burst", async () => {
      await connection.execute("DELETE FROM speed_index_recalculation_jobs");
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 20 });
      try {
        await Promise.all(Array.from({ length: 100 }, () => markSpeedIndexDirty(pool)));
        const [[job]] = await connection.execute("SELECT COUNT(*) count,generation,status,run_count FROM speed_index_recalculation_jobs WHERE scope_key=? GROUP BY generation,status,run_count", [SPEED_INDEX_SCOPE]);
        assert.equal(Number(job.count), 1);
        assert.equal(Number(job.generation), 100);
        assert.equal(job.status, "pending");
        const instrumentation = {};
        const result = await runPendingSpeedIndexBatch(pool, { workerId: "burst-worker", instrumentation });
        assert.equal(result.completed, true);
        assert.deepEqual(instrumentation.fullRecalculations, 1);
        assert.deepEqual(instrumentation.clusterScans, 1);
        const [[done]] = await connection.execute("SELECT status,completed_generation,run_count FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
        assert.equal(done.status, "clean");
        assert.equal(Number(done.completed_generation), 100);
        assert.equal(Number(done.run_count), 1);
        t.diagnostic(`Speed burst: legacy=100 full recalculations; deferred=${instrumentation.fullRecalculations}; cluster_scans=${instrumentation.clusterScans}; batch_runtime_ms=${result.runtimeMs}`);
      } finally { await pool.end(); }
    });

    await t.test("two processes claim one generation only once", async () => {
      await markSpeedIndexDirty(connection);
      const [first, second] = await Promise.all([
        runOperationProcess("speed-batch", "run-a", "UTC"),
        runOperationProcess("speed-batch", "run-b", "Europe/Budapest"),
      ]);
      assert.equal([first, second].filter((item) => item.claimed).length, 1);
      const [[job]] = await connection.execute("SELECT status,generation,completed_generation,run_count FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
      assert.equal(job.status, "clean");
      assert.equal(Number(job.generation), Number(job.completed_generation));
      assert.equal(Number(job.run_count), 2);
    });

    await t.test("an article retry reuses its completed scheduling step without advancing the generation", async () => {
      const articleId = await insertArticle(connection, "speed-schedule-retry");
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 3 });
      try {
        const store = createMysqlPipelineStore(pool);
        const firstCoordinator = createPipelineCoordinator(store, { workerId: "schedule-first", staleMs: 1_000 });
        const firstClaim = await firstCoordinator.claimArticle(articleId);
        await firstCoordinator.runStep(firstClaim, "speed_index", async () => ({ scheduled: true }), {
          project: (tx) => markSpeedIndexDirty(tx),
        });
        const [[afterFirst]] = await connection.execute("SELECT generation FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
        await connection.execute("UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE id=?", [articleId]);
        const retryCoordinator = createPipelineCoordinator(store, { workerId: "schedule-retry", staleMs: 1_000 });
        const retryClaim = await retryCoordinator.claimArticle(articleId);
        const reused = await retryCoordinator.runStep(retryClaim, "speed_index", async () => { throw new Error("completed_step_reran"); }, {
          project: () => { throw new Error("completed_projection_reran"); },
        });
        const [[afterRetry]] = await connection.execute("SELECT generation FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
        assert.equal(reused.reused, true);
        assert.equal(Number(afterRetry.generation), Number(afterFirst.generation));
      } finally { await pool.end(); }
    });

    await t.test("stale claims recover and dirty-during-processing is fenced by generation", async () => {
      await markSpeedIndexDirty(connection);
      const first = await claimSpeedIndexBatch(connection, { workerId: "crashed", staleMs: 1_000 });
      assert.ok(first);
      await connection.execute("UPDATE speed_index_recalculation_jobs SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 SECOND WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
      const recovered = await claimSpeedIndexBatch(connection, { workerId: "recovery", staleMs: 1_000 });
      assert.ok(recovered);
      assert.equal(recovered.claimedGeneration, first.claimedGeneration);
      await connection.execute("UPDATE speed_index_recalculation_jobs SET status='failed',claim_token=NULL,claimed_generation=NULL WHERE scope_key=?", [SPEED_INDEX_SCOPE]);

      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      try {
        let advanced = false;
        const firstRun = await runPendingSpeedIndexBatch(pool, {
          workerId: "generation-a",
          beforeComplete: async () => {
            await markSpeedIndexDirty(pool);
            advanced = true;
          },
        });
        assert.equal(advanced, true);
        const [[pending]] = await connection.execute("SELECT status,generation,completed_generation FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
        assert.equal(pending.status, "pending");
        assert.equal(Number(pending.generation), firstRun.claimedGeneration + 1);
        assert.equal(Number(pending.completed_generation), firstRun.claimedGeneration);
        const secondRun = await runPendingSpeedIndexBatch(pool, { workerId: "generation-b" });
        assert.equal(secondRun.claimedGeneration, Number(pending.generation));
        const [[clean]] = await connection.execute("SELECT status,generation,completed_generation FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
        assert.equal(clean.status, "clean");
        assert.equal(Number(clean.generation), Number(clean.completed_generation));
      } finally { await pool.end(); }
    });

    await t.test("score, history, and completion roll back atomically on injected faults", async () => {
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
      const baselineRows = async () => {
        const [[score]] = await connection.execute("SELECT COUNT(*) count,COALESCE(SUM(avg_delay_minutes),0) total FROM speed_index");
        const [[history]] = await connection.execute("SELECT COUNT(*) count FROM speed_index_history");
        return { score: { count: Number(score.count), total: Number(score.total) }, history: Number(history.count) };
      };
      try {
        for (const failure of ["after-score", "history", "completion", "before-commit"]) {
          await markSpeedIndexDirty(connection);
          const before = await baselineRows();
          await assert.rejects(runPendingSpeedIndexBatch(pool, {
            workerId: `fault-${failure}`,
            calculationHooks: failure === "after-score" ? { afterScoreWrite: () => { throw new Error("injected_after_score"); } }
              : failure === "history" ? { beforeHistoryWrite: () => { throw new Error("injected_history"); } } : undefined,
            beforeComplete: failure === "completion" ? async ({ connection: tx, claim }) => {
              await tx.execute("UPDATE speed_index_recalculation_jobs SET claim_token='00000000-0000-0000-0000-000000000000' WHERE scope_key=? AND claim_token=?", [claim.scopeKey, claim.claimToken]);
            } : failure === "before-commit" ? () => { throw new Error("injected_before_commit"); } : undefined,
          }));
          const after = await baselineRows();
          assert.deepEqual(after, before, failure);
          const [[job]] = await connection.execute("SELECT status,generation,completed_generation FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
          assert.equal(job.status, "failed", failure);
          assert.ok(Number(job.generation) > Number(job.completed_generation), failure);
        }
      } finally { await pool.end(); }
    });

    await t.test("deferred execution is result-equivalent and history-idempotent", async () => {
      await connection.execute("DELETE FROM speed_index");
      await connection.execute("DELETE FROM speed_index_history WHERE event_key IS NOT NULL");
      await updateSpeedIndex({ connection, strict: true });
      const [referenceScores] = await connection.execute("SELECT source,avg_delay_minutes,median_delay_minutes FROM speed_index ORDER BY source");
      const [referenceHistory] = await connection.execute("SELECT event_key,source,delay_minutes FROM speed_index_history WHERE event_key IS NOT NULL ORDER BY event_key");
      await connection.execute("DELETE FROM speed_index");
      await connection.execute("DELETE FROM speed_index_history WHERE event_key IS NOT NULL");
      await markSpeedIndexDirty(connection);
      const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 3 });
      try {
        await runPendingSpeedIndexBatch(pool, { workerId: "equivalence" });
        const [batchScores] = await connection.execute("SELECT source,avg_delay_minutes,median_delay_minutes FROM speed_index ORDER BY source");
        const [batchHistory] = await connection.execute("SELECT event_key,source,delay_minutes FROM speed_index_history WHERE event_key IS NOT NULL ORDER BY event_key");
        assert.deepEqual(batchScores, referenceScores);
        assert.deepEqual(batchHistory, referenceHistory);
        const historyCount = batchHistory.length;
        await markSpeedIndexDirty(connection);
        await runPendingSpeedIndexBatch(pool, { workerId: "equivalence-rerun" });
        const [[after]] = await connection.execute("SELECT COUNT(*) count FROM speed_index_history WHERE event_key IS NOT NULL");
        assert.equal(Number(after.count), historyCount);
      } finally { await pool.end(); }
    });

    await t.test("cluster advisory lock serializes two processes and releases cleanly", async () => {
      for (let iteration = 0; iteration < 10; iteration++) {
        const embedding = Array.from({ length: 8 }, (_, index) => index / 10 + 0.1 + iteration / 1000);
        const firstId = await insertArticle(connection, `cluster-a-${iteration}`, "pending", { embedding, source: "telex.hu" });
        const secondId = await insertArticle(connection, `cluster-b-${iteration}`, "pending", { embedding, source: "hvg.hu" });
        const [first, second] = await Promise.all([
          runOperationProcess("cluster", firstId, "UTC"),
          runOperationProcess("cluster", secondId, "Europe/Budapest"),
        ]);
        assert.equal(first.clusterId, second.clusterId);
        const [[clusterCount]] = await connection.execute("SELECT COUNT(DISTINCT cluster_id) count FROM articles WHERE id IN (?,?)", [firstId, secondId]);
        assert.equal(Number(clusterCount.count), 1);
        const [[lockState]] = await connection.execute("SELECT IS_FREE_LOCK('utom:cluster:utc-day:v1') free");
        assert.equal(lockState.free, 1);
      }
    });

    await t.test("complete canonical pipeline reaches done with mocked external services", async () => {
      const articleId = await insertArticle(connection, "full-pipeline", "pending", { source: "telex.hu" });
      const result = await runOperationProcess("pipeline", articleId, "Europe/Budapest");
      assert.equal(result.article.status, "done");
      const states = new Map(result.steps.map((step) => [step.step_name, step.status]));
      const required = ["scrape", "short_summary", "long_summary", "plagiarism", "category", "title", "keywords", "trends", "source", "summary_persistence", "clickbait", "embedding", "cluster", "speed_index"];
      for (const step of required) assert.equal(states.get(step), "done", step);
      const [[scheduled]] = await connection.execute("SELECT status,generation,completed_generation FROM speed_index_recalculation_jobs WHERE scope_key=?", [SPEED_INDEX_SCOPE]);
      assert.equal(scheduled.status, "pending");
      assert.ok(Number(scheduled.generation) > Number(scheduled.completed_generation));
      const batchResult = await runOperationProcess("speed-batch", "full-pipeline", "UTC");
      assert.equal(batchResult.completed, true);
      assert.ok(result.pipelineRuntimeMs > 0);
      assert.ok(batchResult.runtimeMs >= 0);
      t.diagnostic(`Canonical runtimes: article_pipeline_ms=${result.pipelineRuntimeMs}; speed_batch_ms=${batchResult.runtimeMs}`);
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

    await t.test("worker SIGTERM and SIGINT stop claiming, record shutdown, close pools, and release locks", async () => {
      await connection.execute("UPDATE articles SET status='done',worker_id=NULL,claim_token=NULL,heartbeat_at=NULL WHERE status<>'needs_recovery'");
      await connection.execute("UPDATE speed_index_recalculation_jobs SET status='clean',completed_generation=generation,worker_id=NULL,claim_token=NULL,heartbeat_at=NULL");
      for (const signal of ["SIGTERM", "SIGINT"]) {
        const workerId = `lifecycle-${signal.toLowerCase()}-${process.pid}`;
        const child = spawnPipelineWorker(workerId);
        let stderr = "";
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        await waitForWorkerRegistration(connection, workerId);
        child.send({ signal });
        const exit = await waitForExit(child);
        assert.equal(exit.code, 0, stderr);
        const [[worker]] = await connection.execute("SELECT state,shutdown_at FROM worker_runtime_health WHERE worker_id=?", [workerId]);
        assert.equal(worker.state, "stopped");
        assert.ok(worker.shutdown_at);
      }
      const [[clusterLock]] = await connection.execute("SELECT IS_FREE_LOCK('utom:cluster:utc-day:v1') free");
      assert.equal(clusterLock.free, 1);
    });

    await t.test("summary search pagination is stable across equal timestamps", async () => {
      const ids = [];
      for (let index = 0; index < 25; index++) {
        const articleId = await insertArticle(connection, `page-${index}`, "done");
        const [result] = await connection.execute(
          "INSERT INTO summaries(article_id,title,content,created_at) VALUES (?,?,?,?)",
          [articleId, `needle ${index}`, "needle fixture", "2026-09-28 12:00:00"],
        );
        ids.push(Number(result.insertId));
      }
      const pages = [];
      for (let offset = 0; offset < 30; offset += 10) {
        const [rows] = await connection.execute(
          "SELECT id FROM summaries WHERE title LIKE ? OR content LIKE ? OR detailed_content LIKE ? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
          ["%needle%", "%needle%", "%needle%", 10, offset],
        );
        pages.push(rows.map((row) => Number(row.id)));
      }
      assert.equal(pages[0].length, 10);
      assert.equal(pages[1].length, 10);
      assert.equal(pages[2].length, 5);
      assert.equal(new Set(pages.flat()).size, 25);
      assert.deepEqual(pages.flat(), ids.sort((a, b) => b - a));
    });

    await t.test("MySQL session records commit, roll back, expire, reconnect, and release locks", async () => {
      const [userResult] = await connection.execute("INSERT INTO users(email,nickname,password_hash) VALUES (?,?,?)", [`session-${process.pid}@example.invalid`, `session-${process.pid}`, "fixture"]);
      const userId = Number(userResult.insertId);
      const first = await mysql.createConnection(safeConfig());
      await first.beginTransaction();
      await first.execute("INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES (?,?,UTC_TIMESTAMP()+INTERVAL 1 HOUR)", [userId, "a".repeat(64)]);
      await first.rollback();
      assert.equal(Number((await first.execute("SELECT COUNT(*) count FROM user_sessions WHERE user_id=?", [userId]))[0][0].count), 0);
      await first.beginTransaction();
      await first.execute("INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES (?,?,UTC_TIMESTAMP()+INTERVAL 1 HOUR)", [userId, "b".repeat(64)]);
      await first.commit();
      await first.end();
      const second = await mysql.createConnection(safeConfig());
      assert.equal(Number((await second.execute("SELECT COUNT(*) count FROM user_sessions WHERE user_id=? AND expires_at>UTC_TIMESTAMP()", [userId]))[0][0].count), 1);
      await second.execute("UPDATE user_sessions SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND WHERE user_id=?", [userId]);
      assert.equal(Number((await second.execute("SELECT COUNT(*) count FROM user_sessions WHERE user_id=? AND expires_at>UTC_TIMESTAMP()", [userId]))[0][0].count), 0);
      const [[lock]] = await second.execute("SELECT GET_LOCK('utom:session-test',0) acquired");
      assert.equal(lock.acquired, 1);
      await second.end();
      const [[freeLock]] = await connection.execute("SELECT IS_FREE_LOCK('utom:session-test') free");
      assert.equal(freeLock.free, 1);
    });

    await t.test("shared rate limiter is atomic across processes, restart-persistent, expiring, and indexed", async () => {
      const config = safeConfig();
      const pool = mysql.createPool({ ...config, connectionLimit: 4 });
      try {
        for (let round = 0; round < 3; round++) {
          const identity = `shared-${process.pid}-${round}`, limit = 10, nowMs = 2_000_000_000_000 + round * 120_000;
          const started = process.hrtime.bigint();
          const [a, b] = await Promise.all([runRateLimitProcess(identity, 15, limit, 60_000, nowMs), runRateLimitProcess(identity, 15, limit, 60_000, nowMs)]);
          assert.equal(a.accepted + b.accepted, limit);
          assert.equal(a.rejected + b.rejected, 20);
          const restart = await runRateLimitProcess(identity, 1, limit, 60_000, nowMs);
          assert.deepEqual(restart, { accepted: 0, rejected: 1 });
          const nextWindow = await runRateLimitProcess(identity, 1, limit, 60_000, nowMs + 60_000);
          assert.deepEqual(nextWindow, { accepted: 1, rejected: 0 });
          t.diagnostic(`LOCAL SYNTHETIC MEASUREMENT rate_limit_round=${round + 1} attempts=30 accepted=10 duration_ms=${Number(process.hrtime.bigint()-started)/1e6}`);
        }
        const singleStarted = process.hrtime.bigint();
        const different = await consumeRateLimit(pool, { scope: "fixture", identity: `different-${process.pid}`, limit: 1, windowMs: 60_000 });
        assert.equal(different.accepted, true);
        assert.equal(different.windowStartMs % 60_000, 0);
        t.diagnostic(`LOCAL SYNTHETIC MEASUREMENT rate_limit_single_ms=${Number(process.hrtime.bigint()-singleStarted)/1e6}`);
        await connection.execute("UPDATE shared_rate_limits SET expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE bucket_key LIKE 'fixture:%'");
        assert.ok(await cleanupExpiredRateLimits(pool, 500) > 0);
        await connection.execute("INSERT INTO shared_rate_limits(bucket_key,window_start_ms,accepted_count,total_count,expires_at) VALUES ('fixture:x',1,1,1,UTC_TIMESTAMP(6)+INTERVAL 1 HOUR)");
        const [plan] = await connection.query("EXPLAIN SELECT accepted_count FROM shared_rate_limits WHERE bucket_key='fixture:x' AND window_start_ms=1");
        assert.equal(plan[0].key, "PRIMARY");
      } finally { await pool.end(); }
      const unavailable = { getConnection: async () => { throw new Error("db_down"); } };
      await assert.rejects(consumeRateLimit(unavailable, { identity: "x" }), /db_down/);
      assert.equal(await consumeRateLimitFailClosed(unavailable, { identity: "x" }), false);
    });

    const [counts] = await connection.query("SELECT (SELECT COUNT(*) FROM summaries) summaries, (SELECT COUNT(*) FROM keywords) keywords");
    assert.ok(Number(counts[0].summaries) >= 1);
    assert.ok(Number(counts[0].keywords) >= 1);
  } finally {
    await resetDatabase(connection);
    await connection.end();
  }
});
