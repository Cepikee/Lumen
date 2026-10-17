"use strict";

require("dotenv").config({ path: process.env.UTOM_ENV_FILE || "/var/www/utom/.env" });
const { randomUUID } = require("node:crypto");
const mysql = require("mysql2/promise");
const { getImageConfig, validateImageConfig, resolveImageRolloutPolicy } = require("../lib/article-images/config");
const { createCloudflareImageProvider } = require("../lib/article-images/provider");
const { createImageStorage } = require("../lib/article-images/storage");
const { createCircuitBreaker } = require("../lib/article-images/circuit-breaker");
const { createImageRepository } = require("../lib/article-images/repository");
const { createImageService } = require("../lib/article-images/service");

const defaultLogger = (entry) => console.log(JSON.stringify({ at: new Date().toISOString(), component: "article-image-worker", ...entry }));

function abortableWait(ms, signal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = Number.isFinite(ms) ? setTimeout(done, ms) : null;
    function done() { if (timer) clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); }
    signal?.addEventListener("abort", done, { once: true });
  });
}

function createStopState(signalEmitter, logger) {
  const controller = new AbortController();
  let stopping = false;
  let receivedSignal = null;
  const requestStop = (signal = "requested") => {
    if (stopping) return;
    stopping = true;
    receivedSignal = signal;
    logger({ event: "article_image_worker_stopping", signal });
    controller.abort();
  };
  const onTerm = () => requestStop("SIGTERM");
  const onInt = () => requestStop("SIGINT");
  signalEmitter?.on("SIGTERM", onTerm);
  signalEmitter?.on("SIGINT", onInt);
  return {
    get stopping() { return stopping; },
    get receivedSignal() { return receivedSignal; },
    signal: controller.signal,
    requestStop,
    dispose() {
      signalEmitter?.removeListener("SIGTERM", onTerm);
      signalEmitter?.removeListener("SIGINT", onInt);
    },
  };
}

function createPool(config) {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME || "utom_dev", waitForConnections: true,
    connectionLimit: Math.max(2, config.concurrency + 1), queueLimit: 0, connectTimeout: 10_000,
  });
}

function createRuntime(dependencies, config, logger) {
  const pool = dependencies.pool || createPool(config);
  const repository = dependencies.repository || createImageRepository(pool);
  let circuitBreaker = dependencies.circuitBreaker || null;
  let service = dependencies.service;
  if (!service) {
    const provider = dependencies.provider || createCloudflareImageProvider(config);
    const storage = dependencies.storage || createImageStorage(config, { logger });
    circuitBreaker ||= createCircuitBreaker({ failureThreshold: config.circuitFailures, cooldownMs: config.circuitCooldownMs });
    service = createImageService({ repository, provider, storage, circuitBreaker, config, logger });
  }
  return { pool, repository, service, circuitBreaker, ownsPool: !dependencies.pool };
}

async function processWithHeartbeat({ claim, service, repository, heartbeatMs, logger }) {
  let stopped = false;
  let timer = null;
  const heartbeat = async () => {
    if (stopped) return;
    try {
      await repository.heartbeat(claim);
    } catch (error) {
      if (!stopped) logger({ event: "article_image_heartbeat_failed", articleId: claim.articleId, error: String(error?.message || error).slice(0, 500) });
    } finally {
      if (!stopped) { timer = setTimeout(heartbeat, heartbeatMs); timer.unref?.(); }
    }
  };
  timer = setTimeout(heartbeat, heartbeatMs);
  timer.unref?.();
  try {
    return await service.process(claim);
  } finally {
    stopped = true;
    if (timer) clearTimeout(timer);
  }
}

async function runOnce(dependencies = {}) {
  const logger = dependencies.logger || defaultLogger;
  const config = dependencies.config || getImageConfig();
  const readiness = validateImageConfig(config);
  if (!readiness.ok) { logger({ event: "worker_disabled", reason: readiness.reason }); return { processed: 0, reason: readiness.reason }; }
  const rollout = resolveImageRolloutPolicy(config, { explicitArticleId: dependencies.articleId != null });
  const runtime = createRuntime(dependencies, config, logger);
  const workerId = dependencies.workerId || process.env.IMAGE_GEN_WORKER_ID || `${process.pid}-${randomUUID()}`;
  let processed = 0;
  const results = [];
  let claimed = 0;
  const maxJobs = Number.isSafeInteger(dependencies.maxJobs) && dependencies.maxJobs > 0 ? dependencies.maxJobs : Number.POSITIVE_INFINITY;
  try {
    await runtime.repository.enqueueCompleted(100, rollout);
    const tasks = Array.from({ length: config.concurrency }, async () => {
      for (;;) {
        if (claimed >= maxJobs) break;
        claimed += 1;
        const claim = await runtime.repository.claim({ workerId, claimToken: randomUUID(), staleMs: config.staleMs, maxAttempts: config.maxRetries,
          articleId: dependencies.articleId, ...rollout });
        if (!claim) { claimed -= 1; break; }
        logger({ event: "article_image_claimed", articleId: claim.articleId, workerId });
        const outcome = await runtime.service.process(claim, dependencies.processOptions);
        results.push({ articleId: claim.articleId, ...outcome });
        processed += 1;
      }
    });
    await Promise.all(tasks);
    return { processed, results };
  } finally {
    if (runtime.ownsPool) await runtime.pool.end();
  }
}

async function runContinuous(dependencies = {}) {
  const logger = dependencies.logger || defaultLogger;
  const config = dependencies.config || getImageConfig();
  const readiness = validateImageConfig(config);
  const stop = createStopState(dependencies.signalEmitter || process, logger);
  const wait = dependencies.wait || abortableWait;
  if (!readiness.ok && readiness.reason !== "disabled") {
    stop.dispose();
    throw new Error(`image_worker_startup_failed:${readiness.reason}`);
  }
  if (!readiness.ok) {
    logger({ event: "worker_disabled", reason: readiness.reason });
    while (!dependencies.exitWhenDisabled && !stop.stopping) await wait(60_000, stop.signal);
    stop.dispose();
    return { processed: 0, reason: readiness.reason };
  }

  let rollout;
  try {
    rollout = resolveImageRolloutPolicy(config);
  } catch (error) {
    stop.dispose();
    throw new Error(`image_worker_startup_failed:${error.message}`);
  }

  const runtime = createRuntime(dependencies, config, logger);
  const workerId = dependencies.workerId || process.env.IMAGE_GEN_WORKER_ID || `${process.pid}-${randomUUID()}`;
  const heartbeatMs = dependencies.heartbeatMs || Math.max(1_000, Math.min(30_000, Math.trunc(config.staleMs / 3)));
  const idleMs = config.workerIdleMs || 2_000;
  let processed = 0;
  let loopFailures = 0;
  let backlog = null;
  try {
    backlog = typeof runtime.repository.getAutomaticBacklogSummary === "function"
      ? await runtime.repository.getAutomaticBacklogSummary(rollout)
      : null;
  } catch (error) {
    stop.dispose();
    if (runtime.ownsPool) await runtime.pool.end();
    throw error;
  }
  logger({ event: "article_image_worker_started", provider: config.provider, model: config.model, concurrency: config.concurrency, idleMs,
    enabled: true, workerId, minArticleId: rollout.minArticleId, backfillExisting: rollout.backfillExisting, rolloutMode: rollout.mode, backlog });

  try {
    while (!stop.stopping) {
      try {
        await runtime.repository.enqueueCompleted(100, rollout);
        const claims = [];
        for (let index = 0; index < config.concurrency && !stop.stopping; index += 1) {
          const claim = await runtime.repository.claim({ workerId, claimToken: randomUUID(), staleMs: config.staleMs, maxAttempts: config.maxRetries, ...rollout });
          if (!claim) break;
          claims.push(claim);
          logger({ event: "article_image_claimed", articleId: claim.articleId, workerId });
        }
        if (!claims.length) {
          loopFailures = 0;
          await wait(idleMs, stop.signal);
          continue;
        }
        const outcomes = await Promise.allSettled(claims.map((claim) => processWithHeartbeat({
          claim, service: runtime.service, repository: runtime.repository, heartbeatMs, logger,
        })));
        outcomes.forEach((outcome, index) => {
          if (outcome.status === "fulfilled") { processed += 1; return; }
          logger({ event: "article_image_failed", articleId: claims[index].articleId, error: String(outcome.reason?.message || outcome.reason).slice(0, 500) });
        });
        loopFailures = 0;
      } catch (error) {
        if (stop.stopping) break;
        loopFailures += 1;
        const backoffMs = Math.min(30_000, idleMs * (2 ** Math.min(loopFailures, 4)));
        logger({ event: "article_image_worker_loop_failed", error: String(error?.message || error).slice(0, 500), backoffMs });
        await wait(backoffMs, stop.signal);
      }
    }
  } finally {
    stop.dispose();
    if (runtime.ownsPool) await runtime.pool.end();
    logger({ event: "article_image_worker_stopped", signal: stop.receivedSignal, processed });
  }
  return { processed, signal: stop.receivedSignal };
}

async function main() {
  if (process.argv.includes("--once")) {
    const result = await runOnce();
    defaultLogger({ event: "worker_complete", ...result });
    return;
  }
  await runContinuous();
}

if (require.main === module) {
  main().catch((error) => {
    defaultLogger({ event: "worker_failed", error: String(error?.message || error).slice(0, 500) });
    process.exitCode = 1;
  });
}

module.exports = { abortableWait, processWithHeartbeat, runOnce, runContinuous };
