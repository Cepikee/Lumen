"use strict";

require("dotenv").config({ path: process.env.UTOM_ENV_FILE || "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { getImageConfig, validateImageConfig } = require("../lib/article-images/config");
const { imagePolicy } = require("../lib/article-images/policy");
const { createCloudflareImageProvider } = require("../lib/article-images/provider");
const { createImageRepository } = require("../lib/article-images/repository");
const { createImageStorage } = require("../lib/article-images/storage");
const { runOnce } = require("../pipeline/image-worker");

function assertSmokeSuccess(report) {
  if (report.worker?.processed !== 1 || report.worker?.results?.length !== 1) throw new Error("worker_did_not_process_exactly_one_article");
  const outcome = report.worker.results[0];
  if (outcome.status !== "ready" || outcome.reused !== false) {
    const reason = report.dbRow?.last_error_code || outcome.reason || outcome.status || "unknown";
    const error = new Error(`image_not_generated:${reason}`);
    error.articleId = report.articleId;
    error.reason = reason;
    error.providerStatus = /^http_(\d+)$/.test(reason) ? Number(reason.slice(5)) : null;
    throw error;
  }
  if (report.providerRequests !== 1) throw new Error(report.providerRequests === 0 ? "provider_request_missing" : "provider_request_limit_exceeded");
  const row = report.dbRow;
  if (!row || row.image_status !== "ready" || row.generation_status !== "done" || row.source_type !== "generated" || !row.storage_path) throw new Error("database_image_not_ready");
  if (!report.file || report.file.storagePath !== row.storage_path) throw new Error("stored_image_missing_or_invalid");
  if (Number(report.file.width) !== 1024 || Number(report.file.height) !== 576) throw new Error("stored_image_dimensions_invalid");
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(report.file.mimeType) || report.file.mimeType !== row.mime_type) throw new Error("stored_image_mime_invalid");
  return report;
}

async function runSmoke(dependencies = {}) {
  const baseConfig = dependencies.config || getImageConfig();
  const config = Object.freeze({ ...baseConfig, concurrency: 1, maxRetries: 0 });
  const readiness = validateImageConfig(config);
  if (!readiness.ok) throw new Error(`image_generation_not_ready:${readiness.reason}`);
  const pool = dependencies.pool || mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME || "utom_dev", waitForConnections: true, connectionLimit: 2, queueLimit: 0,
  });
  const repository = dependencies.repository || createImageRepository(pool);
  const storage = dependencies.storage || createImageStorage(config);
  const actualProvider = dependencies.provider || createCloudflareImageProvider(config);
  let providerRequests = 0;
  const provider = {
    name: actualProvider.name,
    async generate(prompt) {
      providerRequests += 1;
      if (providerRequests > 1) throw new Error("smoke_provider_request_limit_exceeded");
      return actualProvider.generate(prompt);
    },
  };
  try {
    await repository.enqueueCompleted(100);
    const candidates = await repository.listSmokeCandidates(100);
    const article = candidates.find((candidate) => imagePolicy(candidate, { enabled: true }).action === "generate");
    if (!article) throw new Error("no_eligible_non_ready_smoke_article");
    await repository.resetForSmoke(article.id);
    const worker = await runOnce({
      pool, repository, provider, storage, config, maxJobs: 1, articleId: article.id,
      processOptions: { allowExistingRecovery: false, allowClusterReuse: false },
    });
    const dbRow = await repository.getImageState(article.id);
    const file = dbRow?.storage_path ? await storage.inspect(dbRow.storage_path) : null;
    return assertSmokeSuccess({ articleId: article.id, providerRequests, worker, dbRow, file, model: config.model });
  } finally {
    if (!dependencies.pool) await pool.end();
  }
}

async function main() {
  if (process.env.RUN_CLOUDFLARE_IMAGE_SMOKE !== "1") {
    console.log("SKIP: set RUN_CLOUDFLARE_IMAGE_SMOKE=1 to authorize a real provider request.");
    return;
  }
  if (process.env.IMAGE_GEN_ENABLED !== "true") throw new Error("IMAGE_GEN_ENABLED=true is required");
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !(process.env.CLOUDFLARE_AI_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN)) throw new Error("Cloudflare image credentials are required");
  const report = await runSmoke();
  console.log("REAL CLOUDFLARE IMAGE SMOKE: PASS");
  console.log(JSON.stringify({ articleId: report.articleId, provider: "cloudflare", model: report.model,
    mime: report.file.mimeType, dimensions: `${report.file.width}x${report.file.height}`,
    storagePath: report.file.storagePath, status: report.dbRow.image_status, providerRequests: report.providerRequests }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error("REAL CLOUDFLARE IMAGE SMOKE: FAIL");
    console.error(JSON.stringify({ articleId: error?.articleId || null, reason: error?.reason || String(error?.message || error).slice(0, 200), providerStatus: error?.providerStatus || null }));
    process.exitCode = 1;
  });
}

module.exports = { assertSmokeSuccess, runSmoke };
