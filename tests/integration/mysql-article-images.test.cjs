"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const mysql = require("mysql2/promise");
const fixtures = require("../helpers/image-fixtures.cjs");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { createImageRepository } = require("../../lib/article-images/repository");
const { createImageService } = require("../../lib/article-images/service");
const { createImageStorage } = require("../../lib/article-images/storage");
const { createCircuitBreaker } = require("../../lib/article-images/circuit-breaker");
const { imagePolicy } = require("../../lib/article-images/policy");
const { runContinuous } = require("../../pipeline/image-worker");

function configFromUrl() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL || "");
  const database = url.pathname.slice(1);
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  const explicitlyAllowedWsl = process.env.UTOM_TEST_MYSQL_ALLOW_WSL === "1" && /^(172\.(1[6-9]|2\d|3[01])|192\.168|10)\./.test(url.hostname);
  if ((!loopback && !explicitlyAllowedWsl) || !database.endsWith("_test")) {
    throw new Error("MySQL image tests require a loopback _test database");
  }
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

async function reset(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  const [tables] = await connection.query("SHOW TABLES");
  for (const row of tables) await connection.query(`DROP TABLE \`${String(Object.values(row)[0]).replace(/`/g, "``")}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
}

test("MySQL 8 image migrations, fencing, budget concurrency and crash recovery", { timeout: 120_000 }, async (t) => {
  const config = configFromUrl();
  const connection = await mysql.createConnection(config);
  const migrations = loadMigrations();
  let pool;
  let storageRoot;
  try {
    await reset(connection);
    await applyMigrations(connection, migrations.slice(0, 62));
    const [legacy] = await connection.execute(
      "INSERT INTO articles (title,url_canonical,short_summary,category,status,processed,cluster_id) VALUES (?,?,?,?, 'done',1,?)",
      ["Meglévő cikk", "https://example.test/image-legacy", "Tényszerű összefoglaló.", "Gazdaság", 700],
    );
    await applyMigrations(connection, migrations);
    assert.equal((await applyMigrations(connection, migrations)).length, 0, "migration chain must be idempotent");
    const [[preserved]] = await connection.execute("SELECT title,status,processed FROM articles WHERE id=?", [legacy.insertId]);
    assert.deepEqual({ title: preserved.title, status: preserved.status, processed: preserved.processed }, { title: "Meglévő cikk", status: "done", processed: 1 });
    const [columns] = await connection.query("SHOW COLUMNS FROM article_images");
    assert.ok(columns.some((row) => row.Field === "reused_from_article_id" && row.Null === "YES"));
    const [indexes] = await connection.query("SHOW INDEX FROM article_images");
    assert.ok(indexes.some((row) => row.Key_name === "idx_article_images_work"));
    assert.ok(indexes.some((row) => row.Key_name === "idx_article_images_reused_from"));
    const [foreignKeys] = await connection.query(
      "SELECT CONSTRAINT_NAME,DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='article_images'",
    );
    assert.ok(foreignKeys.some((row) => row.CONSTRAINT_NAME === "fk_article_images_article" && row.DELETE_RULE === "CASCADE"));
    assert.ok(foreignKeys.some((row) => row.CONSTRAINT_NAME === "fk_article_images_reused_from" && row.DELETE_RULE === "SET NULL"));
    const [[tableInfo]] = await connection.query("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='article_images'");
    assert.equal(tableInfo.ENGINE, "InnoDB");
    assert.equal(tableInfo.TABLE_COLLATION, "utf8mb4_0900_ai_ci");

    pool = mysql.createPool({ ...config, connectionLimit: 24 });
    const repository = createImageRepository(pool);
    assert.equal(await repository.enqueueCompleted(100, { backfillExisting: true }), 1);
    const smokeCandidates = await repository.listSmokeCandidates(100);
    assert.equal(smokeCandidates.length, 1, "canonical schema must execute the production smoke selection query");
    assert.equal(Number(smokeCandidates[0].id), Number(legacy.insertId));
    assert.equal(imagePolicy(smokeCandidates[0], { enabled: true }).action, "generate");
    await repository.resetForSmoke(legacy.insertId);
    const claimA = await repository.claim({ workerId: "worker-a", claimToken: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", staleMs: 60_000, maxAttempts: 2, articleId: legacy.insertId });
    assert.equal(Number(claimA.articleId), Number(legacy.insertId));
    await pool.execute("UPDATE article_images SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE WHERE article_id=?", [legacy.insertId]);
    const claimB = await repository.claim({ workerId: "worker-b", claimToken: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb", staleMs: 60_000, maxAttempts: 2, backfillExisting: true });
    assert.equal(Number(claimB.articleId), Number(legacy.insertId));
    await assert.rejects(repository.heartbeat(claimA), /image_claim_lost/);
    await assert.rejects(repository.complete(claimA, { imageStatus: "failed", generationStatus: "failed", sourceType: "fallback" }), /image_claim_lost/);
    await repository.savePrompt(claimB, {
      policyAction: "generate", promptVersion: "UTOM_EDITORIAL_V1", prompt: "safe", fingerprint: "a".repeat(64),
      provider: "cloudflare", model: "model", storagePath: "2026/10/17/1-aaaaaaaaaaaa.webp",
    });
    await repository.complete(claimB, {
      imageStatus: "ready", generationStatus: "done", sourceType: "generated", storagePath: "2026/10/17/1-aaaaaaaaaaaa.webp",
      mimeType: "image/webp", width: 1024, height: 576, byteSize: 700, retryCount: 0,
    });
    const [[fenced]] = await pool.execute("SELECT image_status,worker_id,claim_token,TIMESTAMPDIFF(SECOND,generated_at,UTC_TIMESTAMP(6)) age FROM article_images WHERE article_id=?", [legacy.insertId]);
    assert.equal(fenced.image_status, "ready");
    assert.equal(fenced.worker_id, null);
    assert.equal(fenced.claim_token, null);
    assert.ok(Math.abs(Number(fenced.age)) < 5, "generated_at must use UTC database time");
    await repository.enqueueCompleted(100, { backfillExisting: true });
    const unchangedClaim = await repository.claim({ workerId: "idempotency", claimToken: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee", staleMs: 60_000, maxAttempts: 2, backfillExisting: true });
    assert.equal(unchangedClaim, null, "a ready unchanged article must not be claimed or consume provider quota again");

    await t.test("rollout cutoff excludes historical materialization and claims while explicit regeneration bypasses it", async () => {
      await pool.query(
        `INSERT INTO articles (id,title,url_canonical,short_summary,category,status,processed) VALUES
          (111,'Historical 111','https://example.test/image-cutoff-111','Old.','Tech','done',1),
          (112,'Historical 112','https://example.test/image-cutoff-112','Old ready.','Tech','done',1),
          (113,'New 113','https://example.test/image-cutoff-113','New.','Tech','done',1)`,
      );
      await pool.query(
        `INSERT INTO article_images (article_id,image_status,generation_status,source_type,storage_path,force_revision) VALUES
          (111,'pending','pending',NULL,NULL,0),
          (112,'ready','done','generated','2026/10/17/112-existing.webp',0)`,
      );
      assert.equal(await repository.enqueueCompleted(100, { minArticleId: 112, backfillExisting: false }), 1);
      const [cutoffRows] = await pool.query("SELECT article_id,image_status,storage_path FROM article_images WHERE article_id IN (111,112,113) ORDER BY article_id");
      assert.deepEqual(cutoffRows.map((row) => [Number(row.article_id), row.image_status, row.storage_path]), [
        [111, "pending", null], [112, "ready", "2026/10/17/112-existing.webp"], [113, "pending", null],
      ]);

      const newClaim = await repository.claim({ workerId: "cutoff-worker", claimToken: "11111111-1111-4111-8111-111111111111",
        staleMs: 60_000, maxAttempts: 2, minArticleId: 112 });
      assert.equal(Number(newClaim.articleId), 113, "a historical pending job must not bypass the automatic cutoff");
      await repository.complete(newClaim, { imageStatus: "fallback", generationStatus: "skipped", sourceType: "fallback", fallbackType: "test" });

      await pool.query("UPDATE article_images SET force_revision=force_revision+1 WHERE article_id=111");
      const manualClaim = await repository.claim({ workerId: "manual-worker", claimToken: "22222222-2222-4222-8222-222222222222",
        staleMs: 60_000, maxAttempts: 2, minArticleId: 112 });
      assert.equal(Number(manualClaim.articleId), 111, "an explicit force revision must keep old-article regeneration available");
      await repository.complete(manualClaim, { imageStatus: "fallback", generationStatus: "skipped", sourceType: "fallback", fallbackType: "manual_test" });
      const [[ready112]] = await pool.query("SELECT image_status,storage_path FROM article_images WHERE article_id=112");
      assert.deepEqual({ status: ready112.image_status, path: ready112.storage_path }, { status: "ready", path: "2026/10/17/112-existing.webp" });
    });

    await t.test("one thousand historical articles remain excluded while the first post-cutoff article is eligible", async () => {
      const historical = Array.from({ length: 1_000 }, (_, index) => [
        2_000 + index, `Historical bulk ${index}`, `https://example.test/image-historical-${index}`, "Old.", "Tech", "done", 1,
      ]);
      await pool.query("INSERT INTO articles (id,title,url_canonical,short_summary,category,status,processed) VALUES ?", [historical]);
      assert.equal(await repository.enqueueCompleted(500, { minArticleId: 2_999 }), 0);
      const [[historicalJobs]] = await pool.query("SELECT COUNT(*) count FROM article_images WHERE article_id BETWEEN 2000 AND 2999");
      assert.equal(Number(historicalJobs.count), 0);
      await pool.query("INSERT INTO articles (id,title,url_canonical,short_summary,category,status,processed) VALUES (3000,'First new','https://example.test/image-first-new','New.','Tech','done',1)");
      assert.equal(await repository.enqueueCompleted(100, { minArticleId: 2_999 }), 1);
      assert.equal(await repository.enqueueCompleted(100, { minArticleId: 2_999 }), 0, "restart with the same cutoff must remain idempotent");
      const summary = await repository.getAutomaticBacklogSummary({ minArticleId: 2_999 });
      assert.ok(summary.historicalArticlesExcluded >= 1_000);
      assert.equal(summary.pendingImageJobs, 1);
      const claim = await repository.claim({ workerId: "new-worker", claimToken: "33333333-3333-4333-8333-333333333333",
        staleMs: 60_000, maxAttempts: 2, minArticleId: 2_999 });
      assert.equal(Number(claim.articleId), 3000);
      await repository.complete(claim, { imageStatus: "fallback", generationStatus: "skipped", sourceType: "fallback", fallbackType: "new_test" });
      await pool.query("DELETE FROM articles WHERE id BETWEEN 2000 AND 3000");
    });

    await pool.execute("DELETE FROM image_generation_daily_usage WHERE provider='concurrency-test'");
    const reservations = await Promise.all(Array.from({ length: 20 }, () => repository.reserveBudget({ provider: "concurrency-test", dailyBudget: 1_000, amount: 100 })));
    assert.equal(reservations.filter(Boolean).length, 10);
    const [[usage]] = await pool.execute("SELECT reserved_neurons,request_count,usage_date=UTC_DATE() is_today FROM image_generation_daily_usage WHERE provider='concurrency-test'");
    assert.equal(Number(usage.reserved_neurons), 1_000);
    assert.equal(Number(usage.request_count), 10);
    assert.equal(Number(usage.is_today), 1);
    await pool.execute("UPDATE image_generation_daily_usage SET usage_date=UTC_DATE()-INTERVAL 1 DAY WHERE provider='concurrency-test'");
    assert.equal(await repository.reserveBudget({ provider: "concurrency-test", dailyBudget: 1_000, amount: 100 }), true);
    const [[utcRollover]] = await pool.execute(
      "SELECT COUNT(*) buckets, SUM(usage_date=UTC_DATE()) today_buckets, SUM(IF(usage_date=UTC_DATE(),reserved_neurons,0)) today_reserved FROM image_generation_daily_usage WHERE provider='concurrency-test'",
    );
    assert.deepEqual(
      { buckets: Number(utcRollover.buckets), today: Number(utcRollover.today_buckets), reserved: Number(utcRollover.today_reserved) },
      { buckets: 2, today: 1, reserved: 100 },
      "a new UTC day must create a fresh budget bucket",
    );

    const [crashArticle] = await pool.execute(
      "INSERT INTO articles (title,url_canonical,short_summary,category,status,processed) VALUES (?,?,?,?, 'done',1)",
      ["Crash recovery", "https://example.test/image-crash", "A szolgáltatás új adatot közölt.", "Tech"],
    );
    await repository.enqueueCompleted(100, { backfillExisting: true });
    const crashClaimA = await repository.claim({ workerId: "crash-a", claimToken: "cccccccc-cccc-4ccc-cccc-cccccccccccc", staleMs: 60_000, maxAttempts: 2, backfillExisting: true });
    assert.equal(Number(crashClaimA.articleId), Number(crashArticle.insertId));
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-mysql-"));
    const storage = createImageStorage({ storageRoot, width: 1024, height: 576, quality: 82 });
    const input = fixtures.png();
    let providerCalls = 0;
    let failTerminalOnce = true;
    const crashRepository = { ...repository, complete: async (...args) => {
      if (failTerminalOnce) { failTerminalOnce = false; throw new Error("simulated_terminal_db_outage"); }
      return repository.complete(...args);
    } };
    const imageConfig = { enabled: true, provider: "cloudflare", model: "model", width: 1024, height: 576, maxRetries: 0, dailyBudget: 10_000, estimatedNeurons: 100 };
    const firstService = createImageService({ repository: crashRepository, provider: { generate: async () => { providerCalls += 1; return { bytes: input }; } }, storage,
      circuitBreaker: createCircuitBreaker(), config: imageConfig });
    await assert.rejects(firstService.process(crashClaimA), /simulated_terminal_db_outage/);
    assert.equal(providerCalls, 1);
    const [[interrupted]] = await pool.execute("SELECT image_status,storage_path FROM article_images WHERE article_id=?", [crashArticle.insertId]);
    assert.equal(interrupted.image_status, "generating");
    assert.equal(interrupted.storage_path, null, "pre-terminal DB state must not claim a format before validated bytes exist");
    const interruptedArticle = await repository.load(crashClaimA);
    assert.ok(await storage.findExisting({ articleId: crashArticle.insertId, fingerprint: interruptedArticle.fingerprint, date: interruptedArticle.image_created_at }));
    await pool.execute("UPDATE article_images SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE WHERE article_id=?", [crashArticle.insertId]);
    const crashClaimB = await repository.claim({ workerId: "crash-b", claimToken: "dddddddd-dddd-4ddd-dddd-dddddddddddd", staleMs: 60_000, maxAttempts: 2, backfillExisting: true });
    const recoveryService = createImageService({ repository, provider: { generate: async () => { providerCalls += 1; throw new Error("provider_must_not_run"); } }, storage,
      circuitBreaker: createCircuitBreaker(), config: imageConfig });
    const recovered = await recoveryService.process(crashClaimB);
    assert.equal(recovered.recovered, true);
    assert.equal(providerCalls, 1);
    const [[ready]] = await pool.execute("SELECT image_status,generation_status,source_type,last_error_code FROM article_images WHERE article_id=?", [crashArticle.insertId]);
    assert.deepEqual({ image_status: ready.image_status, generation_status: ready.generation_status, source_type: ready.source_type, last_error_code: ready.last_error_code },
      { image_status: "ready", generation_status: "done", source_type: "generated", last_error_code: null });

    const backlogValues = Array.from({ length: 20 }, (_, index) => [
      `Backlog ${index + 1}`, `https://example.test/image-backlog-${index + 1}`, "Feldolgozott cikk.", "Tech",
    ]);
    const [[{ rollout_cutoff: rolloutCutoff }]] = await pool.query("SELECT COALESCE(MAX(id),0) rollout_cutoff FROM articles");
    await pool.query(
      "INSERT INTO articles (title,url_canonical,short_summary,category,status,processed) VALUES ?",
      [backlogValues.map((row) => [...row, "done", 1])],
    );
    const signalEmitter = new EventEmitter();
    const workerReport = await runContinuous({
      pool, repository, signalEmitter, workerId: "mysql-continuous-worker",
      config: {
        enabled: true, provider: "cloudflare", accountId: "test", apiToken: "test", model: "model",
        concurrency: 1, workerIdleMs: 5, staleMs: 60_000, maxRetries: 2,
        circuitFailures: 3, circuitCooldownMs: 300_000,
        minArticleId: Number(rolloutCutoff), backfillExisting: false,
      },
      service: {
        process: async (claim) => {
          await repository.complete(claim, { imageStatus: "fallback", generationStatus: "skipped", sourceType: "fallback", fallbackType: "integration_test" });
          return { status: "fallback" };
        },
      },
      wait: async () => signalEmitter.emit("SIGTERM"),
      logger: () => {},
    });
    assert.equal(workerReport.processed, 20, "continuous worker must drain every eligible backlog row before idling");
    const [[backlogState]] = await pool.query(
      "SELECT COUNT(*) total, COUNT(DISTINCT ai.article_id) distinct_articles, SUM(ai.image_status='fallback') terminal, SUM(ai.worker_id IS NULL AND ai.claim_token IS NULL) released FROM article_images ai JOIN articles a ON a.id=ai.article_id WHERE a.url_canonical LIKE 'https://example.test/image-backlog-%'",
    );
    assert.deepEqual(
      { total: Number(backlogState.total), distinct: Number(backlogState.distinct_articles), terminal: Number(backlogState.terminal), released: Number(backlogState.released) },
      { total: 20, distinct: 20, terminal: 20, released: 20 },
    );

    const competingValues = Array.from({ length: 10 }, (_, index) => [
      `Competing ${index + 1}`, `https://example.test/image-competing-${index + 1}`, "Két worker verseng érte.", "Tech", "done", 1,
    ]);
    await pool.query(
      "INSERT INTO articles (title,url_canonical,short_summary,category,status,processed) VALUES ?",
      [competingValues],
    );
    const worker = (workerId) => {
      const emitter = new EventEmitter();
      return runContinuous({
        pool, repository, signalEmitter: emitter, workerId,
        config: {
          enabled: true, provider: "cloudflare", accountId: "test", apiToken: "test", model: "model",
          concurrency: 1, workerIdleMs: 5, staleMs: 60_000, maxRetries: 2,
          circuitFailures: 3, circuitCooldownMs: 300_000,
          minArticleId: Number(rolloutCutoff), backfillExisting: false,
        },
        service: {
          process: async (claim) => {
            await new Promise((resolve) => setImmediate(resolve));
            await repository.complete(claim, { imageStatus: "fallback", generationStatus: "skipped", sourceType: "fallback", fallbackType: "competing_worker_test" });
            return { status: "fallback" };
          },
        },
        wait: async () => emitter.emit("SIGTERM"),
        logger: () => {},
      });
    };
    const competingReports = await Promise.all([worker("mysql-worker-a"), worker("mysql-worker-b")]);
    assert.equal(competingReports.reduce((sum, report) => sum + report.processed, 0), 10);
    const [[competingState]] = await pool.query(
      "SELECT COUNT(*) total, COUNT(DISTINCT ai.article_id) distinct_articles, SUM(ai.image_status='fallback') terminal FROM article_images ai JOIN articles a ON a.id=ai.article_id WHERE a.url_canonical LIKE 'https://example.test/image-competing-%'",
    );
    assert.deepEqual(
      { total: Number(competingState.total), distinct: Number(competingState.distinct_articles), terminal: Number(competingState.terminal) },
      { total: 10, distinct: 10, terminal: 10 },
      "competing continuous workers must never duplicate a claim",
    );

    await t.test("cluster reuse is limited to compatible ready image metadata", async () => {
      const [sameCluster] = await pool.execute(
        "INSERT INTO articles (title,url_canonical,short_summary,category,status,processed,cluster_id) VALUES (?,?,?,?, 'done',1,?)",
        ["Kapcsolódó cikk", "https://example.test/image-cluster", "Azonos esemény.", "Gazdaság", 700],
      );
      const compatible = await repository.findClusterReady({ id: sameCluster.insertId, cluster_id: 700 }, { provider: "cloudflare", model: "model", promptVersion: "UTOM_EDITORIAL_V1" });
      assert.equal(Number(compatible.article_id), Number(legacy.insertId));
      const incompatible = await repository.findClusterReady({ id: sameCluster.insertId, cluster_id: 700 }, { provider: "cloudflare", model: "other", promptVersion: "UTOM_EDITORIAL_V1" });
      assert.equal(incompatible, null);
    });
  } finally {
    if (pool) await pool.end();
    await connection.end();
    if (storageRoot) await fs.rm(storageRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});
