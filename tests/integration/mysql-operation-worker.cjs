"use strict";

const mysql = require("mysql2/promise");

function configFromUrl() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  };
}

(async () => {
  const [mode, value] = process.argv.slice(2);
  const config = configFromUrl();
  if (mode === "cluster") {
    Object.assign(process.env, {
      DB_HOST: config.host,
      DB_PORT: String(config.port),
      DB_USER: config.user,
      DB_PASSWORD: config.password,
      DB_NAME: config.database,
    });
    const { clusterArticle } = require("../../pipeline/clusterArticles");
    process.stdout.write(`\nRESULT_JSON:${JSON.stringify(await clusterArticle(Number(value)))}`);
    return;
  }
  if (mode === "pipeline") {
    Object.assign(process.env, {
      DB_HOST: config.host,
      DB_PORT: String(config.port),
      DB_USER: config.user,
      DB_PASSWORD: config.password,
      DB_NAME: config.database,
      UTOM_OFFLINE_MODE: "true",
      AI_PROVIDER: "mock",
      UTOM_WORKER_ID: `pipeline-process-${process.pid}`,
    });
    if (!process.env.DB_PASSWORD?.trim()) throw new Error("test_worker_db_password_missing_before_pipeline");
    const { processArticlePipeline, shutdownPipelineResources } = require("../../pipeline/cron");
    const { createMysqlPipelineStore, createPipelineCoordinator } = require("../../pipeline/state-machine");
    const pool = mysql.createPool({ ...config, connectionLimit: 4 });
    const coordinator = createPipelineCoordinator(createMysqlPipelineStore(pool), { workerId: process.env.UTOM_WORKER_ID, staleMs: 60_000 });
    const articleId = Number(value);
    try {
      const [rows] = await pool.execute(
        "SELECT id,title,url_canonical,content_text,category,source,short_summary,long_summary,embedding,cluster_id FROM articles WHERE id=?",
        [articleId],
      );
      const claim = await coordinator.claimArticle(articleId);
      if (!claim) throw new Error("pipeline_claim_failed");
      const startedAt = Date.now();
      await processArticlePipeline(rows[0], claim);
      await coordinator.finishArticle(claim);
      const pipelineRuntimeMs = Date.now() - startedAt;
      const [[article]] = await pool.execute("SELECT status FROM articles WHERE id=?", [articleId]);
      const [steps] = await pool.execute("SELECT step_name,status FROM article_processing_steps WHERE article_id=? ORDER BY step_name", [articleId]);
      process.stdout.write(`\nRESULT_JSON:${JSON.stringify({ article, steps, pipelineRuntimeMs })}`);
    } finally {
      await pool.end();
      await shutdownPipelineResources();
    }
    return;
  }
  if (mode === "speed") {
    Object.assign(process.env, {
      DB_HOST: config.host,
      DB_PORT: String(config.port),
      DB_USER: config.user,
      DB_PASSWORD: config.password,
      DB_NAME: config.database,
    });
    if (!process.env.DB_PASSWORD?.trim()) throw new Error("test_worker_db_password_missing_before_speed");
    const { updateSpeedIndex } = require("../../pipeline/updateSpeedIndex");
    process.stdout.write(`\nRESULT_JSON:${JSON.stringify(await updateSpeedIndex())}`);
    return;
  }
  if (mode === "speed-batch") {
    const { runPendingSpeedIndexBatch } = require("../../pipeline/speedIndexBatch");
    const pool = mysql.createPool({ ...config, connectionLimit: 2 });
    try {
      const result = await runPendingSpeedIndexBatch(pool, { workerId: `speed-process-${process.pid}`, staleMs: 1_000 });
      process.stdout.write(`\nRESULT_JSON:${JSON.stringify(result)}`);
    } finally {
      await pool.end();
    }
    return;
  }
  if (mode === "ingest") {
    const { ingestFeedArticle } = require("../../lib/feed-ingestion");
    const connection = await mysql.createConnection(config);
    try {
      const item = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
      process.stdout.write(`\nRESULT_JSON:${JSON.stringify(await ingestFeedArticle(connection, item))}`);
    } finally {
      await connection.end();
    }
    return;
  }
  throw new Error(`unknown worker mode: ${mode}`);
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
