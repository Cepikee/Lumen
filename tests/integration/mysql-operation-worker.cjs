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
    const { processArticlePipeline } = require("../../pipeline/cron");
    const { createMysqlPipelineStore, createPipelineCoordinator } = require("../../pipeline/state-machine");
    const pool = mysql.createPool({ ...config, connectionLimit: 4 });
    const coordinator = createPipelineCoordinator(createMysqlPipelineStore(pool), { workerId: process.env.UTOM_WORKER_ID, staleMs: 60_000 });
    const articleId = Number(value);
    const [rows] = await pool.execute(
      "SELECT id,title,url_canonical,content_text,category,source,short_summary,long_summary,embedding,cluster_id FROM articles WHERE id=?",
      [articleId],
    );
    const claim = await coordinator.claimArticle(articleId);
    if (!claim) throw new Error("pipeline_claim_failed");
    await processArticlePipeline(rows[0], claim);
    await coordinator.finishArticle(claim);
    const [[article]] = await pool.execute("SELECT status FROM articles WHERE id=?", [articleId]);
    const [steps] = await pool.execute("SELECT step_name,status FROM article_processing_steps WHERE article_id=? ORDER BY step_name", [articleId]);
    process.stdout.write(`\nRESULT_JSON:${JSON.stringify({ article, steps })}`);
    await pool.end();
    setImmediate(() => process.exit(0));
    return;
  }
  throw new Error(`unknown worker mode: ${mode}`);
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
