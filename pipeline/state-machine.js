"use strict";

const { randomUUID } = require("node:crypto");

const REQUIRED_STEPS = Object.freeze([
  "scrape", "short_summary", "long_summary", "category", "title", "keywords", "trends", "source",
  "plagiarism", "summary_persistence", "clickbait", "embedding", "cluster", "speed_index",
]);
const OPTIONAL_STEPS = Object.freeze(["sentiment"]);
const ALL_STEPS = Object.freeze([...REQUIRED_STEPS, ...OPTIONAL_STEPS]);

function safeError(error) {
  return String(error instanceof Error ? error.message : error).slice(0, 1000);
}

function parseResult(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
}

function createPipelineCoordinator(store, options = {}) {
  const workerId = options.workerId || `${process.pid}-${randomUUID()}`;
  const staleMs = options.staleMs || 15 * 60 * 1000;
  const maxArticleAttempts = options.maxArticleAttempts || 3;
  const now = options.now || (() => new Date());
  const log = options.logger || (() => {});
  const tokenRef = (claim) => String(claim?.claimToken || "").slice(0, 8);

  async function claimArticle(articleId) {
    const claimToken = randomUUID();
    await store.quarantineStaleUncertain?.({ articleId, staleMs });
    const claimed = await store.claimArticle({ articleId, workerId, claimToken, staleMs, maxArticleAttempts });
    const claim = claimed ? { articleId, workerId, claimToken } : null;
    log({ event: claimed ? "article_claimed" : "article_claim_rejected", articleId, workerId, claim: tokenRef(claim) });
    return claim;
  }

  async function heartbeat(claim) {
    if (!(await store.heartbeatArticle({ ...claim, now: now() }))) {
      log({ event: "claim_lost", articleId: claim.articleId, workerId: claim.workerId, claim: tokenRef(claim) });
      throw new Error("article_claim_lost");
    }
  }

  async function runStep(claim, stepName, handler, optionsForStep = {}) {
    if (!ALL_STEPS.includes(stepName)) throw new Error(`unknown_pipeline_step:${stepName}`);
    const state = await store.claimStep({ ...claim, stepName, staleMs });
    if (state.status === "done" || state.status === "skipped") {
      log({ event: "step_reused", articleId: claim.articleId, step: stepName, state: state.status, workerId, claim: tokenRef(claim) });
      return { reused: true, status: state.status, result: parseResult(state.result_json) };
    }
    if (!state.claimed) throw new Error(`step_claim_unavailable:${stepName}`);
    let heartbeatError = null;
    const heartbeatTimer = setInterval(() => {
      heartbeat(claim).catch((error) => { heartbeatError = error; });
    }, Math.max(10_000, Math.floor(staleMs / 3)));
    heartbeatTimer.unref?.();
    try {
      await heartbeat(claim);
      if (optionsForStep.external) {
        if (!optionsForStep.operationKey) throw new Error(`external_operation_key_missing:${stepName}`);
        await store.beginExternalStep({ ...claim, stepName, operationKey: optionsForStep.operationKey });
      }
      const result = await handler();
      await heartbeat(claim);
      if (heartbeatError) throw heartbeatError;
      const status = result?.skipped && optionsForStep.optional ? "skipped" : "done";
      await store.completeStep({ ...claim, stepName, status, result: result ?? null, now: now() });
      return { reused: false, status, result: result ?? null };
    } catch (error) {
      const message = safeError(error);
      if (optionsForStep.external && !message.includes("claim_lost")) {
        await store.markExternalUncertain({
          ...claim,
          stepName,
          operationKey: optionsForStep.operationKey,
          error: message,
          errorType: "external_outcome_uncertain",
        });
        log({ event: "external_operation_uncertain", articleId: claim.articleId, step: stepName, state: "uncertain", workerId, claim: tokenRef(claim) });
        throw new Error(`external_operation_uncertain:${stepName}`);
      }
      if (optionsForStep.optional && !message.includes("claim_lost")) {
        await store.completeStep({
          ...claim,
          stepName,
          status: "skipped",
          result: { error: message },
          now: now(),
        });
        return { reused: false, status: "skipped", result: { error: message } };
      }
      await store.failStep({ ...claim, stepName, error: safeError(error), now: now() });
      await store.failArticle({ ...claim, stepName, error: safeError(error), now: now() });
      log({ event: "step_failed", articleId: claim.articleId, step: stepName, state: "failed", workerId, claim: tokenRef(claim) });
      throw error;
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  async function finishArticle(claim) {
    const states = await store.getStepStates(claim.articleId);
    const byName = new Map(states.map((row) => [row.step_name, row.status]));
    const missing = REQUIRED_STEPS.filter((step) => byName.get(step) !== "done");
    if (missing.length) throw new Error(`required_steps_incomplete:${missing.join(",")}`);
    const invalidOptional = OPTIONAL_STEPS.filter((step) => !["done", "skipped"].includes(byName.get(step)));
    if (invalidOptional.length) throw new Error(`optional_steps_incomplete:${invalidOptional.join(",")}`);
    return store.completeArticle({ ...claim, now: now() });
  }

  async function failArticle(claim, stepName, error) {
    return store.failArticle({ ...claim, stepName, error: safeError(error), now: now() });
  }

  return { workerId, claimArticle, heartbeat, runStep, finishArticle, failArticle };
}

function createMysqlPipelineStore(pool) {
  return {
    async quarantineStaleUncertain({ articleId, staleMs }) {
      await pool.execute(
        `UPDATE articles a SET a.status='needs_recovery', a.failed_step=(
           SELECT s.step_name FROM article_processing_steps s
           WHERE s.article_id=a.id AND s.status='uncertain' LIMIT 1
         ), a.last_processing_error='external_operation_outcome_uncertain'
         WHERE a.id=? AND a.status='in_progress'
           AND a.heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND
           AND EXISTS (SELECT 1 FROM article_processing_steps s WHERE s.article_id=a.id AND s.status='uncertain')`,
        [articleId, Math.trunc(staleMs * 1000)],
      );
    },
    async claimArticle({ articleId, workerId, claimToken, staleMs, maxArticleAttempts }) {
      const [result] = await pool.execute(
        `UPDATE articles SET status='in_progress', worker_id=?, claim_token=?, claimed_at=UTC_TIMESTAMP(6),
          heartbeat_at=UTC_TIMESTAMP(6), processing_attempts=processing_attempts+1,
          failed_step=NULL, last_processing_error=NULL
         WHERE id=? AND (status='pending' OR
           (status='in_progress' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND
             AND NOT EXISTS (SELECT 1 FROM article_processing_steps s WHERE s.article_id=articles.id AND s.status='uncertain')) OR
           (status='failed' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND AND processing_attempts < ?))`,
        [workerId, claimToken, articleId, Math.trunc(staleMs * 1000), Math.trunc(staleMs * 1000), maxArticleAttempts],
      );
      return result.affectedRows === 1;
    },
    async heartbeatArticle({ articleId, workerId, claimToken }) {
      const [result] = await pool.execute(
        "UPDATE articles SET heartbeat_at=UTC_TIMESTAMP(6) WHERE id=? AND status='in_progress' AND worker_id=? AND claim_token=?",
        [articleId, workerId, claimToken],
      );
      return result.affectedRows === 1;
    },
    async claimStep({ articleId, stepName, workerId, claimToken, staleMs }) {
      await pool.execute(
        "INSERT IGNORE INTO article_processing_steps (article_id, step_name, status) VALUES (?, ?, 'pending')",
        [articleId, stepName],
      );
      const [result] = await pool.execute(
        `UPDATE article_processing_steps SET status='in_progress', worker_id=?, claim_token=?,
          attempt_count=attempt_count+1, started_at=UTC_TIMESTAMP(6), heartbeat_at=UTC_TIMESTAMP(6), last_error=NULL
         WHERE article_id=? AND step_name=? AND
          (status IN ('pending','failed') OR (status='in_progress' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND))
          AND EXISTS (SELECT 1 FROM articles a WHERE a.id=? AND a.status='in_progress' AND a.worker_id=? AND a.claim_token=?)`,
        [workerId, claimToken, articleId, stepName, Math.trunc(staleMs * 1000), articleId, workerId, claimToken],
      );
      if (result.affectedRows === 1) return { claimed: true, status: "in_progress", result_json: null };
      const [rows] = await pool.execute(
        "SELECT status, result_json FROM article_processing_steps WHERE article_id=? AND step_name=? LIMIT 1",
        [articleId, stepName],
      );
      return { claimed: false, status: rows[0]?.status || "missing", result_json: rows[0]?.result_json ?? null };
    },
    async beginExternalStep({ articleId, stepName, workerId, claimToken, operationKey }) {
      const [result] = await pool.execute(
        `UPDATE article_processing_steps s SET s.status='uncertain', s.is_external=1, s.operation_key=?,
          s.external_started_at=UTC_TIMESTAMP(6), s.retryable=0
         WHERE s.article_id=? AND s.step_name=? AND s.status='in_progress' AND s.worker_id=? AND s.claim_token=?
          AND EXISTS (SELECT 1 FROM articles a WHERE a.id=? AND a.status='in_progress' AND a.worker_id=? AND a.claim_token=?)`,
        [operationKey, articleId, stepName, workerId, claimToken, articleId, workerId, claimToken],
      );
      if (result.affectedRows !== 1) throw new Error(`step_claim_lost:${stepName}`);
    },
    async completeStep({ articleId, stepName, workerId, claimToken, status, result }) {
      const [dbResult] = await pool.execute(
        `UPDATE article_processing_steps SET status=?, result_json=?, completed_at=UTC_TIMESTAMP(6), heartbeat_at=UTC_TIMESTAMP(6)
         WHERE article_id=? AND step_name=? AND status IN ('in_progress','uncertain') AND worker_id=? AND claim_token=?
          AND EXISTS (SELECT 1 FROM articles a WHERE a.id=? AND a.status='in_progress' AND a.worker_id=? AND a.claim_token=?)`,
        [status, JSON.stringify(result ?? null), articleId, stepName, workerId, claimToken, articleId, workerId, claimToken],
      );
      if (dbResult.affectedRows !== 1) throw new Error(`step_claim_lost:${stepName}`);
    },
    async failStep({ articleId, stepName, workerId, claimToken, error }) {
      const [result] = await pool.execute(
        `UPDATE article_processing_steps SET status='failed', last_error=?, heartbeat_at=UTC_TIMESTAMP(6)
         WHERE article_id=? AND step_name=? AND worker_id=? AND claim_token=?
          AND EXISTS (SELECT 1 FROM articles a WHERE a.id=? AND a.status='in_progress' AND a.worker_id=? AND a.claim_token=?)`,
        [error, articleId, stepName, workerId, claimToken, articleId, workerId, claimToken],
      );
      if (result.affectedRows !== 1) throw new Error(`step_claim_lost:${stepName}`);
    },
    async failArticle({ articleId, stepName, workerId, claimToken, error }) {
      const [result] = await pool.execute(
        `UPDATE articles SET status='failed', failed_step=?, last_processing_error=?, heartbeat_at=UTC_TIMESTAMP(6)
         WHERE id=? AND status='in_progress' AND worker_id=? AND claim_token=?`,
        [stepName, error, articleId, workerId, claimToken],
      );
      if (result.affectedRows !== 1) throw new Error("article_claim_lost");
    },
    async markExternalUncertain({ articleId, stepName, workerId, claimToken, operationKey, error, errorType }) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [stepResult] = await connection.execute(
          `UPDATE article_processing_steps s SET s.status='uncertain', s.operation_key=?, s.is_external=1,
            s.last_error=?, s.error_type=?, s.retryable=0, s.heartbeat_at=UTC_TIMESTAMP(6)
           WHERE s.article_id=? AND s.step_name=? AND s.worker_id=? AND s.claim_token=?
            AND EXISTS (SELECT 1 FROM articles a WHERE a.id=? AND a.status='in_progress' AND a.worker_id=? AND a.claim_token=?)`,
          [operationKey, error, errorType, articleId, stepName, workerId, claimToken, articleId, workerId, claimToken],
        );
        if (stepResult.affectedRows !== 1) throw new Error(`step_claim_lost:${stepName}`);
        const [articleResult] = await connection.execute(
          `UPDATE articles SET status='needs_recovery', failed_step=?, last_processing_error=?
           WHERE id=? AND status='in_progress' AND worker_id=? AND claim_token=?`,
          [stepName, error, articleId, workerId, claimToken],
        );
        if (articleResult.affectedRows !== 1) throw new Error("article_claim_lost");
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async getStepStates(articleId) {
      const [rows] = await pool.execute(
        "SELECT step_name, status FROM article_processing_steps WHERE article_id=?",
        [articleId],
      );
      return rows;
    },
    async completeArticle({ articleId, workerId, claimToken }) {
      const [result] = await pool.execute(
        `UPDATE articles SET status='done', worker_id=NULL, claim_token=NULL, heartbeat_at=NULL,
          failed_step=NULL, last_processing_error=NULL
         WHERE id=? AND status='in_progress' AND worker_id=? AND claim_token=?`,
        [articleId, workerId, claimToken],
      );
      if (result.affectedRows !== 1) throw new Error("article_claim_lost");
      return true;
    },
  };
}

module.exports = { ALL_STEPS, OPTIONAL_STEPS, REQUIRED_STEPS, createMysqlPipelineStore, createPipelineCoordinator };
