"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mysql = require("mysql2/promise");
const fixtures = require("../helpers/image-fixtures.cjs");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { createImageRepository } = require("../../lib/article-images/repository");
const { createImageService } = require("../../lib/article-images/service");
const { createImageStorage } = require("../../lib/article-images/storage");
const { createCircuitBreaker } = require("../../lib/article-images/circuit-breaker");

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
    assert.equal(await repository.enqueueCompleted(), 1);
    const claimA = await repository.claim({ workerId: "worker-a", claimToken: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", staleMs: 60_000, maxAttempts: 2 });
    assert.equal(Number(claimA.articleId), Number(legacy.insertId));
    await pool.execute("UPDATE article_images SET heartbeat_at=UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE WHERE article_id=?", [legacy.insertId]);
    const claimB = await repository.claim({ workerId: "worker-b", claimToken: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb", staleMs: 60_000, maxAttempts: 2 });
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
    await repository.enqueueCompleted();
    const unchangedClaim = await repository.claim({ workerId: "idempotency", claimToken: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee", staleMs: 60_000, maxAttempts: 2 });
    assert.equal(unchangedClaim, null, "a ready unchanged article must not be claimed or consume provider quota again");

    await pool.execute("DELETE FROM image_generation_daily_usage WHERE provider='concurrency-test'");
    const reservations = await Promise.all(Array.from({ length: 20 }, () => repository.reserveBudget({ provider: "concurrency-test", dailyBudget: 1_000, amount: 100 })));
    assert.equal(reservations.filter(Boolean).length, 10);
    const [[usage]] = await pool.execute("SELECT reserved_neurons,request_count,usage_date=UTC_DATE() is_today FROM image_generation_daily_usage WHERE provider='concurrency-test'");
    assert.equal(Number(usage.reserved_neurons), 1_000);
    assert.equal(Number(usage.request_count), 10);
    assert.equal(Number(usage.is_today), 1);

    const [crashArticle] = await pool.execute(
      "INSERT INTO articles (title,url_canonical,short_summary,category,status,processed) VALUES (?,?,?,?, 'done',1)",
      ["Crash recovery", "https://example.test/image-crash", "A szolgáltatás új adatot közölt.", "Tech"],
    );
    await repository.enqueueCompleted();
    const crashClaimA = await repository.claim({ workerId: "crash-a", claimToken: "cccccccc-cccc-4ccc-cccc-cccccccccccc", staleMs: 60_000, maxAttempts: 2 });
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
    const crashClaimB = await repository.claim({ workerId: "crash-b", claimToken: "dddddddd-dddd-4ddd-dddd-dddddddddddd", staleMs: 60_000, maxAttempts: 2 });
    const recoveryService = createImageService({ repository, provider: { generate: async () => { providerCalls += 1; throw new Error("provider_must_not_run"); } }, storage,
      circuitBreaker: createCircuitBreaker(), config: imageConfig });
    const recovered = await recoveryService.process(crashClaimB);
    assert.equal(recovered.recovered, true);
    assert.equal(providerCalls, 1);
    const [[ready]] = await pool.execute("SELECT image_status,generation_status,source_type,last_error_code FROM article_images WHERE article_id=?", [crashArticle.insertId]);
    assert.deepEqual({ image_status: ready.image_status, generation_status: ready.generation_status, source_type: ready.source_type, last_error_code: ready.last_error_code },
      { image_status: "ready", generation_status: "done", source_type: "generated", last_error_code: null });

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
