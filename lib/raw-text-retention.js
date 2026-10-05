"use strict";

const { randomUUID } = require("node:crypto");

const POLICY_VERSION = "raw-text-2026-10";
const DEFAULT_SUCCESS_HOURS = 24;
const DEFAULT_FAILED_DAYS = 7;
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 1000;
const MAX_ARTICLE_ATTEMPTS = 3;
const REQUIRED_STEPS = Object.freeze([
  "scrape", "short_summary", "long_summary", "category", "title", "keywords", "trends", "source",
  "plagiarism", "summary_persistence", "clickbait", "embedding", "cluster", "speed_index",
]);
const TERMINAL_STEPS = new Set(["done", "skipped", "failed"]);
const ACTIVE_STEPS = new Set(["pending", "in_progress", "uncertain"]);

function parsePositiveInteger(value, fallback, name) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${name}_invalid`);
  return number;
}

function retentionPolicy(env = process.env) {
  return Object.freeze({
    successHours: parsePositiveInteger(env.UTOM_RAW_TEXT_SUCCESS_HOURS, DEFAULT_SUCCESS_HOURS, "raw_text_success_hours"),
    failedDays: parsePositiveInteger(env.UTOM_RAW_TEXT_FAILED_DAYS, DEFAULT_FAILED_DAYS, "raw_text_failed_days"),
    version: String(env.UTOM_RAW_TEXT_POLICY_VERSION || POLICY_VERSION).slice(0, 32),
  });
}

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasActiveClaim(article) {
  return article?.status === "in_progress"
    || Boolean(article?.worker_id || article?.claim_token)
    || Boolean(article?.heartbeat_at && article?.status !== "done" && article?.status !== "failed");
}

function normalizeRows(value) { return Array.isArray(value) ? value : []; }

function evaluateRetentionEligibility({ article, steps = [], v2Steps = [], missingEvidenceSpans = 0, now = new Date(), policy = retentionPolicy() } = {}) {
  if (!article || !Number.isSafeInteger(Number(article.id)) || Number(article.id) <= 0) return { eligible: false, reason: "article_invalid" };
  if (article.content_text == null) return { eligible: false, reason: "already_purged" };
  if (hasActiveClaim(article)) return { eligible: false, reason: "active_claim" };
  if (Number(missingEvidenceSpans || 0) > 0) return { eligible: false, reason: "evidence_span_missing" };
  const rows = normalizeRows(steps);
  const v2 = normalizeRows(v2Steps);
  if (v2.some((step) => step.status !== "completed" && step.status !== "skipped")) return { eligible: false, reason: "v2_projection_incomplete" };
  if (rows.some((step) => ACTIVE_STEPS.has(String(step.status)))) return { eligible: false, reason: "raw_step_active" };
  if (rows.some((step) => !TERMINAL_STEPS.has(String(step.status)))) return { eligible: false, reason: "raw_step_non_terminal" };
  const updatedAt = asDate(article.updated_at || article.updatedAt);
  const current = asDate(now);
  if (!updatedAt || !current) return { eligible: false, reason: "timestamp_invalid" };
  const ageMs = Math.max(0, current.getTime() - updatedAt.getTime());
  if (article.status === "done") {
    const state = new Map(rows.map((step) => [String(step.step_name || step.stepName), String(step.status)]));
    const missing = REQUIRED_STEPS.filter((step) => state.get(step) !== "done");
    if (missing.length) return { eligible: false, reason: `required_steps_incomplete:${missing.join(",")}` };
    if (rows.some((step) => String(step.status) === "failed")) return { eligible: false, reason: "failed_step_present" };
    const requiredAgeMs = policy.successHours * 60 * 60 * 1000;
    if (ageMs < requiredAgeMs) return { eligible: false, reason: "success_retention_window" };
    return { eligible: true, kind: "successful", reason: "terminal_success_after_policy_window", eligibleAt: new Date(updatedAt.getTime() + requiredAgeMs) };
  }
  if (article.status === "failed") {
    const requiredAgeMs = policy.failedDays * 24 * 60 * 60 * 1000;
    if (ageMs < requiredAgeMs) return { eligible: false, reason: "failed_retention_window" };
    const retryable = rows.some((step) => String(step.status) === "failed" && Number(step.retryable) !== 0);
    const attempts = Number(article.processing_attempts ?? article.processingAttempts ?? 0);
    if (retryable && attempts < MAX_ARTICLE_ATTEMPTS) return { eligible: false, reason: "recoverable_retry" };
    if (rows.some((step) => String(step.status) === "failed" && Number(step.is_external) !== 0 && Number(step.retryable) !== 0)) return { eligible: false, reason: "external_recovery_pending" };
    return { eligible: true, kind: "failed", reason: "terminal_failure_after_retry_window", eligibleAt: new Date(updatedAt.getTime() + requiredAgeMs) };
  }
  return { eligible: false, reason: "article_not_terminal" };
}

function normalizeBatchSize(value) {
  const batchSize = value == null ? DEFAULT_BATCH_SIZE : Number(value);
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH_SIZE) throw new Error("retention_batch_size_invalid");
  return batchSize;
}

async function inspectCandidate(connection, articleId) {
  const [[article]] = await connection.execute(
    `SELECT id,status,content_text,updated_at,processing_attempts,worker_id,claim_token,heartbeat_at,content_hash,url_canonical
       FROM articles WHERE id=? FOR UPDATE`, [articleId]);
  if (!article) return null;
  const [steps] = await connection.execute("SELECT step_name,status,retryable,is_external FROM article_processing_steps WHERE article_id=? FOR UPDATE", [articleId]);
  const [v2Steps] = await connection.execute("SELECT status FROM v2_processing_steps WHERE article_id=? FOR UPDATE", [articleId]);
  const [[evidence]] = await connection.execute(
    `SELECT
       (SELECT COUNT(*) FROM v2_claim_evidence WHERE article_id=? AND (text_span IS NULL OR CHAR_LENGTH(TRIM(text_span))=0))
       + (SELECT COUNT(*) FROM v2_relation_evidence WHERE article_id=? AND (text_span IS NULL OR CHAR_LENGTH(TRIM(text_span))=0)) missing_spans`, [articleId, articleId]);
  return { article, steps, v2Steps, missingEvidenceSpans: Number(evidence?.missing_spans || 0) };
}

async function recordAudit(connection, input) {
  await connection.execute(
    `INSERT INTO raw_text_retention_audit
      (run_id,article_id,worker_id,action,mode,reason,policy_version,error_code,eligible_count,purged_count,failed_count,oldest_eligible_at,metadata_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [input.runId, input.articleId ?? null, input.workerId, input.action, input.mode, input.reason ?? null, input.policyVersion,
      input.errorCode ?? null, input.eligibleCount ?? null, input.purgedCount ?? null, input.failedCount ?? null,
      input.oldestEligibleAt ?? null, input.metadata ? JSON.stringify(input.metadata) : null],
  );
}

async function runRetentionBatch(pool, options = {}) {
  if (!pool || typeof pool.getConnection !== "function") throw new TypeError("pool_required");
  const batchSize = normalizeBatchSize(options.batchSize);
  const dryRun = options.dryRun !== false;
  const workerId = String(options.workerId || `retention-${process.pid}`).slice(0, 128);
  const policy = options.policy || retentionPolicy(options.env || process.env);
  const now = asDate(options.now || new Date());
  if (!now) throw new Error("retention_clock_invalid");
  const runId = options.runId || randomUUID();
  let cursor = Number(options.cursor || 0);
  let scanned = 0; let eligibleCount = 0; let purgedCount = 0; let failedCount = 0; let skippedCount = 0;
  let oldestEligibleAt = null;
  while (scanned < batchSize) {
    const limit = Math.min(batchSize - scanned, 100);
    const [candidates] = await pool.execute(
      `SELECT id FROM articles WHERE id>? AND content_text IS NOT NULL AND status IN ('done','failed') ORDER BY id ASC LIMIT ?`, [cursor, limit]);
    if (!candidates.length) break;
    for (const candidate of candidates) {
      cursor = Number(candidate.id); scanned += 1;
      if (dryRun) {
        const connection = await pool.getConnection();
        try {
          const inspected = await inspectCandidate(connection, cursor);
          const decision = inspected && evaluateRetentionEligibility({ ...inspected, now, policy });
          if (decision?.eligible) { eligibleCount += 1; oldestEligibleAt = oldestEligibleAt && oldestEligibleAt < decision.eligibleAt ? oldestEligibleAt : decision.eligibleAt; }
          else skippedCount += 1;
        } finally { connection.release(); }
        continue;
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const inspected = await inspectCandidate(connection, cursor);
        const decision = inspected && evaluateRetentionEligibility({ ...inspected, now, policy });
        if (!decision?.eligible) { skippedCount += 1; await connection.rollback(); continue; }
        eligibleCount += 1;
        oldestEligibleAt = oldestEligibleAt && oldestEligibleAt < decision.eligibleAt ? oldestEligibleAt : decision.eligibleAt;
        await recordAudit(connection, { runId, articleId: cursor, workerId, action: "eligible", mode: "execute", reason: decision.reason, policyVersion: policy.version, metadata: { kind: decision.kind } });
        const [result] = await connection.execute("UPDATE articles SET content_text=NULL WHERE id=? AND content_text IS NOT NULL", [cursor]);
        if (Number(result.affectedRows) !== 1) { skippedCount += 1; await connection.rollback(); continue; }
        await recordAudit(connection, { runId, articleId: cursor, workerId, action: "purged", mode: "execute", reason: decision.reason, policyVersion: policy.version, metadata: { kind: decision.kind } });
        await connection.commit(); purgedCount += 1;
      } catch (error) {
        failedCount += 1;
        try { await connection.rollback(); } catch {}
        try { await recordAudit(pool, { runId, articleId: cursor, workerId, action: "failed", mode: "execute", reason: "transaction_failed", policyVersion: policy.version, errorCode: String(error?.code || "retention_error").slice(0, 96) }); } catch {}
      } finally { connection.release(); }
    }
    if (candidates.length < limit) break;
  }
  const summary = { runId, workerId, mode: dryRun ? "dry-run" : "execute", scanned, eligibleCount, wouldPurge: dryRun ? eligibleCount : 0, purgedCount, failedCount, skippedCount, oldestEligibleAt, nextCursor: cursor };
  try {
    await recordAudit(pool, { runId, workerId, action: "run", mode: summary.mode, policyVersion: policy.version, eligibleCount, purgedCount, failedCount, oldestEligibleAt, metadata: { scanned, skippedCount, batchSize } });
  } catch {}
  return summary;
}

module.exports = {
  POLICY_VERSION, DEFAULT_SUCCESS_HOURS, DEFAULT_FAILED_DAYS, MAX_ARTICLE_ATTEMPTS, REQUIRED_STEPS,
  retentionPolicy, evaluateRetentionEligibility, normalizeBatchSize, runRetentionBatch,
};
