"use strict";

require("dotenv").config({ path: process.env.UTOM_ENV_FILE || "/var/www/utom/.env" });
const { randomUUID } = require("node:crypto");
const mysql = require("mysql2/promise");
const { getImageConfig, validateImageConfig } = require("../lib/article-images/config");
const { createCloudflareImageProvider } = require("../lib/article-images/provider");
const { createImageStorage } = require("../lib/article-images/storage");
const { createCircuitBreaker } = require("../lib/article-images/circuit-breaker");
const { createImageRepository } = require("../lib/article-images/repository");
const { createImageService } = require("../lib/article-images/service");

const config = getImageConfig();
const readiness = validateImageConfig(config);
const logger = (entry) => console.log(JSON.stringify({ at: new Date().toISOString(), component: "article-image-worker", ...entry }));

async function runOnce(dependencies = {}) {
  if (!readiness.ok) { logger({ event: "worker_disabled", reason: readiness.reason }); return { processed: 0, reason: readiness.reason }; }
  const pool = dependencies.pool || mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME || "utom_dev", waitForConnections: true, connectionLimit: Math.max(2, config.concurrency + 1), queueLimit: 0,
  });
  const repository = dependencies.repository || createImageRepository(pool);
  const provider = dependencies.provider || createCloudflareImageProvider(config);
  const storage = dependencies.storage || createImageStorage(config);
  const breaker = dependencies.circuitBreaker || createCircuitBreaker({ failureThreshold: config.circuitFailures, cooldownMs: config.circuitCooldownMs });
  const service = createImageService({ repository, provider, storage, circuitBreaker: breaker, config, logger });
  const workerId = process.env.IMAGE_GEN_WORKER_ID || `${process.pid}-${randomUUID()}`;
  let processed = 0;
  let claimed = 0;
  const maxJobs = Number.isSafeInteger(dependencies.maxJobs) && dependencies.maxJobs > 0 ? dependencies.maxJobs : Number.POSITIVE_INFINITY;
  try {
    await repository.enqueueCompleted(100);
    const tasks = Array.from({ length: config.concurrency }, async () => {
      for (;;) {
        if (claimed >= maxJobs) break;
        claimed += 1;
        const claim = await repository.claim({ workerId, claimToken: randomUUID(), staleMs: config.staleMs, maxAttempts: config.maxRetries });
        if (!claim) { claimed -= 1; break; }
        await service.process(claim);
        processed += 1;
      }
    });
    await Promise.all(tasks);
    return { processed };
  } finally {
    if (!dependencies.pool) await pool.end();
  }
}

if (require.main === module) {
  runOnce().then((result) => { logger({ event: "worker_complete", ...result }); }).catch((error) => {
    logger({ event: "worker_failed", error: String(error?.message || error).slice(0, 500) }); process.exitCode = 1;
  });
}

module.exports = { runOnce };
