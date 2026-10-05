"use strict";

const os = require("node:os");

const DEFAULTS = Object.freeze({
  articleStaleMs: 15 * 60 * 1000,
  workerUnhealthyMs: 3 * 60 * 1000,
  backlogWarningMs: 30 * 60 * 1000,
  speedBatchStaleMs: 15 * 60 * 1000,
});

function getCanonicalLatestSchemaVersion() {
  const { loadMigrations } = require("../db/migration-core.cjs");
  return loadMigrations().at(-1).version;
}

const REQUIRED_SCHEMA = Object.freeze({
  get latestVersion() { return getCanonicalLatestSchemaVersion(); },
  tables: ["article_processing_steps", "speed_index_recalculation_jobs", "worker_runtime_health", "recovery_audit_log", "raw_text_retention_audit", "user_sessions", "shared_rate_limits", "email_outbox", "schema_migrations", "v2_ingestion_provenance"],
  columns: {
    articles: ["worker_id", "claim_token", "heartbeat_at", "processing_attempts", "failed_step", "last_processing_error", "original_url", "external_id", "publication_time_source", "url_identity"],
    article_processing_steps: ["operation_key", "is_external", "external_started_at", "error_type", "retryable"],
    v2_entity_mentions: ["entity_type"],
    v2_entity_alias_observations: ["alias_id", "mention_id", "normalization_version"],
    speed_index_recalculation_jobs: ["generation", "completed_generation", "claimed_generation", "claim_token", "run_count"],
  },
  indexes: {
    articles: ["idx_articles_recovery", "uq_articles_url_identity"],
    article_processing_steps: ["uq_processing_steps_operation_key"],
    speed_index_history: ["uq_speed_history_event_key"],
    v2_ingestion_provenance: ["uq_v2_ingestion_provenance_operation_key"],
  },
});

function thresholds(env = process.env) {
  const positive = (name, fallback) => {
    const value = Number(env[name]);
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
  };
  return {
    articleStaleMs: positive("ARTICLE_CLAIM_STALE_MS", DEFAULTS.articleStaleMs),
    workerUnhealthyMs: positive("WORKER_UNHEALTHY_MS", DEFAULTS.workerUnhealthyMs),
    backlogWarningMs: positive("BACKLOG_WARNING_MS", DEFAULTS.backlogWarningMs),
    speedBatchStaleMs: positive("SPEED_BATCH_STALE_MS", DEFAULTS.speedBatchStaleMs),
  };
}

function redact(value) {
  return String(value ?? "")
    .replace(/(authorization|password|api[_-]?key|secret|token)\s*[=:]\s*([^\s,;]+)/gi, "$1=[REDACTED]")
    .replace(/(mysql:\/\/[^:]+:)[^@]+@/gi, "$1[REDACTED]@");
}

function validateWorkerEnvironment(env = process.env) {
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((name) => !String(env[name] || "").trim());
  if (missing.length) throw new Error(`worker_environment_missing:${missing.join(",")}`);
  const offline = String(env.UTOM_OFFLINE_MODE || "true").toLowerCase() !== "false";
  if (!offline) {
    if (String(env.BACKGROUND_JOBS_ENABLED).toLowerCase() !== "true") throw new Error("background_jobs_not_explicitly_enabled");
    if (String(env.AI_PROVIDER || "mock").toLowerCase() === "openai" && String(env.REAL_AI_ENABLED).toLowerCase() === "true" && !env.OPENAI_API_KEY) {
      throw new Error("openai_api_key_missing");
    }
    if (String(env.FEED_FETCH_ENABLED).toLowerCase() === "true" && String(env.UTOM_INTERNAL_WORKER_TOKEN || "").length < 32) {
      throw new Error("internal_worker_token_missing_or_short");
    }
  }
  return { mode: offline ? "offline" : String(env.NODE_ENV || "staging"), aiProvider: offline ? "mock" : String(env.AI_PROVIDER || "mock") };
}

function validateProductionEnvironment(env = process.env) {
  const result = validateWorkerEnvironment(env);
  if (String(env.NODE_ENV).toLowerCase() !== "production" || String(env.APP_MODE).toLowerCase() !== "production") throw new Error("production_mode_not_explicit");
  const paidAiEnabled = String(env.UTOM_PAID_AI_ENABLED || "").toLowerCase() === "true";
  if (paidAiEnabled) {
    if (String(env.AI_PROVIDER).toLowerCase() !== "openai") throw new Error("production_ai_provider_must_be_explicit");
    if (String(env.REAL_AI_ENABLED).toLowerCase() !== "true" || !env.OPENAI_API_KEY) throw new Error("production_real_ai_configuration_missing");
  }
  if (String(env.UTOM_INTERNAL_WORKER_TOKEN || "").length < 32) throw new Error("production_health_token_missing_or_short");
  const outboxKey = String(env.EMAIL_OUTBOX_ENCRYPTION_KEY || "");
  const decodedOutboxKey = /^[a-f0-9]{64}$/i.test(outboxKey) ? Buffer.from(outboxKey, "hex") : Buffer.from(outboxKey, "base64");
  if (decodedOutboxKey.length !== 32) throw new Error("production_email_outbox_key_missing_or_invalid");
  if (String(env.EMAIL_SEND_ENABLED).toLowerCase() === "true" && ["MAIL_HOST", "MAIL_USER", "MAIL_PASS"].some((name) => !env[name])) throw new Error("production_mail_configuration_missing");
  if (String(env.PAYMENT_ENABLED).toLowerCase() === "true" && !env.PAYMENT_SECRET_KEY) throw new Error("production_payment_configuration_missing");
  if (String(env.VIDEO_GENERATION_ENABLED).toLowerCase() === "true" && (!env.VIDEO_SIGN_SECRET || !env.VIDEO_INPUT_DIR)) throw new Error("production_video_configuration_missing");
  if (String(env.FEED_FETCH_ENABLED).toLowerCase() === "true" && String(env.UTOM_INTERNAL_WORKER_TOKEN || "").length < 32) throw new Error("production_feed_configuration_missing");
  return { ...result, paidAiEnabled };
}

async function checkSchemaReadiness(connection) {
  const [tables] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
  const tableSet = new Set(tables.map((row) => row.TABLE_NAME));
  const missing = REQUIRED_SCHEMA.tables.filter((name) => !tableSet.has(name));
  for (const [table, names] of Object.entries(REQUIRED_SCHEMA.columns)) {
    if (!tableSet.has(table)) { missing.push(`table:${table}`); continue; }
    const [rows] = await connection.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [table]);
    const set = new Set(rows.map((row) => row.COLUMN_NAME));
    for (const name of names) if (!set.has(name)) missing.push(`column:${table}.${name}`);
  }
  for (const [table, names] of Object.entries(REQUIRED_SCHEMA.indexes)) {
    const [rows] = await connection.execute("SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [table]);
    const set = new Set(rows.map((row) => row.INDEX_NAME));
    for (const name of names) if (!set.has(name)) missing.push(`index:${table}.${name}`);
  }
  const [versions] = tableSet.has("schema_migrations") ? await connection.query("SELECT version FROM schema_migrations") : [[]];
  const applied = new Set(versions.map((row) => String(row.version)));
  for (let version = 22; version <= Number(REQUIRED_SCHEMA.latestVersion); version++) if (!applied.has(String(version).padStart(3, "0"))) missing.push(`migration:${version}`);
  const latest = versions.map((row) => String(row.version)).sort().at(-1);
  if (latest && latest !== REQUIRED_SCHEMA.latestVersion) missing.push(`unsupported_schema_version:${latest}`);
  return { ready: missing.length === 0, latestRequiredVersion: REQUIRED_SCHEMA.latestVersion, missing };
}

async function assertSchemaReadiness(connection) {
  const result = await checkSchemaReadiness(connection);
  if (!result.ready) throw new Error(`schema_not_ready:${result.missing.join(",")}`);
  return result;
}

async function registerWorker(connection, workerId) {
  await connection.execute(
    `INSERT INTO worker_runtime_health (worker_id,process_id,hostname,state,started_at,heartbeat_at)
     VALUES (?,?,?,'running',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE process_id=VALUES(process_id),hostname=VALUES(hostname),state='running',started_at=UTC_TIMESTAMP(6),heartbeat_at=UTC_TIMESTAMP(6),shutdown_at=NULL`,
    [workerId, process.pid, os.hostname().slice(0, 255)],
  );
}

async function heartbeatWorker(connection, workerId, event) {
  const eventSql = event === "claim" ? ",last_article_claim_at=UTC_TIMESTAMP(6)" : event === "completion" ? ",last_article_completion_at=UTC_TIMESTAMP(6)" : "";
  await connection.execute(`UPDATE worker_runtime_health SET heartbeat_at=UTC_TIMESTAMP(6),state='running'${eventSql} WHERE worker_id=?`, [workerId]);
}

async function stopWorker(connection, workerId) {
  await connection.execute("UPDATE worker_runtime_health SET state='stopped',shutdown_at=UTC_TIMESTAMP(6),heartbeat_at=UTC_TIMESTAMP(6) WHERE worker_id=?", [workerId]);
}

async function getHealthSnapshot(connection, env = process.env) {
  const limits = thresholds(env);
  const schema = await checkSchemaReadiness(connection);
  if (!schema.ready) return { liveness: true, readiness: false, status: "critical", schema };
  const articleStaleMicros = limits.articleStaleMs * 1000;
  const workerMicros = limits.workerUnhealthyMs * 1000;
  const speedMicros = limits.speedBatchStaleMs * 1000;
  const [[articles]] = await connection.execute(
    `SELECT
      (SELECT COUNT(*) FROM articles WHERE status='pending') pending_count,
      (SELECT COUNT(*) FROM articles WHERE status='in_progress') active_count,
      (SELECT COUNT(*) FROM articles WHERE status='failed') failed_count,
      (SELECT COUNT(*) FROM articles WHERE status='needs_recovery') needs_recovery_count,
      (SELECT COUNT(*) FROM articles WHERE status='in_progress' AND heartbeat_at < UTC_TIMESTAMP(6)-INTERVAL ? MICROSECOND) stale_count,
      (SELECT GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),CURRENT_TIMESTAMP())) FROM articles WHERE status='pending') oldest_pending_seconds,
      (SELECT TIMESTAMPDIFF(SECOND,MIN(COALESCE(heartbeat_at,claimed_at,created_at)),UTC_TIMESTAMP()) FROM articles WHERE status='in_progress') oldest_in_progress_seconds,
      (SELECT GREATEST(0,IF(MIN(heartbeat_at) IS NULL,TIMESTAMPDIFF(SECOND,MIN(updated_at),CURRENT_TIMESTAMP()),TIMESTAMPDIFF(SECOND,MIN(heartbeat_at),UTC_TIMESTAMP()))) FROM articles WHERE status='failed') oldest_failed_seconds,
      (SELECT GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),CURRENT_TIMESTAMP())) FROM articles WHERE status='needs_recovery') oldest_needs_recovery_seconds`, [articleStaleMicros]);
  const [[workers]] = await connection.execute(
    `SELECT COUNT(*) worker_count,SUM(state='running' AND heartbeat_at>=UTC_TIMESTAMP(6)-INTERVAL ? MICROSECOND) healthy_workers,
      MAX(last_article_claim_at) last_article_claim_at,MAX(last_article_completion_at) last_article_completion_at,MAX(heartbeat_at) last_worker_heartbeat
     FROM worker_runtime_health`, [workerMicros]);
  const [[speed]] = await connection.execute(
    `SELECT COUNT(*) job_count,SUM(generation>completed_generation) pending_count,
      SUM(status='in_progress' AND heartbeat_at<UTC_TIMESTAMP(6)-INTERVAL ? MICROSECOND) stale_count,
      MAX(IF(generation>completed_generation,TIMESTAMPDIFF(SECOND,updated_at,UTC_TIMESTAMP()),NULL)) oldest_pending_seconds,
      MAX(last_completed_at) last_completed_at,MAX(generation-completed_generation) generation_lag
     FROM speed_index_recalculation_jobs`, [speedMicros]);
  const numeric = (object) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, typeof value === "bigint" ? Number(value) : value]));
  const normalizedArticles = numeric(articles);
  const normalizedWorkers = numeric(workers);
  const normalizedSpeed = numeric(speed);
  const warning = Number(normalizedArticles.needs_recovery_count || 0) > 0 || Number(normalizedArticles.stale_count || 0) > 0 || Number(normalizedSpeed.stale_count || 0) > 0 || Number(normalizedArticles.oldest_pending_seconds || 0) * 1000 > limits.backlogWarningMs;
  return { liveness: true, readiness: true, status: warning ? "warning" : "healthy", schema, thresholds: limits, workers: normalizedWorkers, articles: normalizedArticles, speedIndex: normalizedSpeed };
}

function normalizeMetricRows(rows = [], key = "status") {
  return Object.fromEntries(rows.map((row) => [String(row[key]), Number(row.count || 0)]));
}

async function getOperationalSnapshot(connection, env = process.env) {
  const health = await getHealthSnapshot(connection, env);
  if (health.readiness === false) return health;
  const [[recentFailures]] = await connection.execute("SELECT COUNT(*) AS count FROM articles WHERE status='failed' AND updated_at >= UTC_TIMESTAMP(6)-INTERVAL 1 HOUR");
  const [articleStates] = await connection.execute("SELECT status, COUNT(*) AS count FROM articles GROUP BY status ORDER BY status");
  const [processingStates] = await connection.execute("SELECT status, COUNT(*) AS count FROM article_processing_steps GROUP BY status ORDER BY status");
  const [backfillStates] = await connection.execute("SELECT status, COUNT(*) AS count FROM v2_processing_steps WHERE step_name='v2.incremental_backfill' GROUP BY status ORDER BY status");
  const [[backfillLast]] = await connection.execute("SELECT MAX(updated_at) AS last_updated FROM v2_processing_steps WHERE step_name='v2.incremental_backfill'");
  const [[rss]] = await connection.execute("SELECT COUNT(*) AS configured_sources, COALESCE(SUM(is_active=1),0) AS active_sources, COALESCE(SUM(is_active=0),0) AS disabled_sources FROM sources");
  const [[ai]] = await connection.execute("SELECT COALESCE(SUM(estimated_cost),0) AS estimated_cost, COALESCE(SUM(provider='mock'),0) AS mock_runs, COALESCE(SUM(provider='openai'),0) AS paid_runs FROM v2_ai_runs");
  const [[aiDecisions]] = await connection.execute("SELECT SUM(escalation=1) AS blocked_escalations FROM v2_ai_decisions");
  const [[retention]] = await connection.execute(
    `SELECT
      (SELECT COUNT(*) FROM articles WHERE content_text IS NOT NULL) AS raw_text_present_count,
      (SELECT eligible_count FROM raw_text_retention_audit WHERE action='run' ORDER BY id DESC LIMIT 1) AS purge_eligible_count,
      (SELECT purged_count FROM raw_text_retention_audit WHERE action='run' ORDER BY id DESC LIMIT 1) AS purged_last_run,
      (SELECT failed_count FROM raw_text_retention_audit WHERE action='run' ORDER BY id DESC LIMIT 1) AS failed_purge_last_run,
      (SELECT oldest_eligible_at FROM raw_text_retention_audit WHERE action='run' ORDER BY id DESC LIMIT 1) AS oldest_eligible,
      (SELECT MAX(created_at) FROM raw_text_retention_audit WHERE action='purged' AND created_at >= UTC_TIMESTAMP(6)-INTERVAL 1 DAY) AS purged_last_24h,
      (SELECT MAX(created_at) FROM raw_text_retention_audit WHERE action='run') AS last_run`);
  const [[v2]] = await connection.execute("SELECT (SELECT COUNT(*) FROM v2_ingestion_provenance) AS ingestion_count, (SELECT COUNT(*) FROM v2_entity_mentions) AS entity_mentions, (SELECT COUNT(*) FROM v2_claims) AS claims, (SELECT COUNT(*) FROM v2_events) AS events, (SELECT COUNT(*) FROM v2_conflicts) AS conflicts, (SELECT COUNT(*) FROM v2_timeline_items) AS timeline_items");
  const [[entityQuality]] = await connection.execute("SELECT COUNT(*) AS mention_count, COALESCE(SUM(entity_id IS NULL),0) AS unresolved_mentions, COALESCE(SUM(entity_id IS NOT NULL),0) AS resolved_mentions FROM v2_entity_mentions");
  const [[claimQuality]] = await connection.execute("SELECT COUNT(*) AS claim_count, COALESCE(SUM(subject_entity_id IS NULL),0) AS unbound_claims, COALESCE(SUM(subject_entity_id IS NOT NULL),0) AS subject_bound_claims FROM v2_claims");
  const numeric = (object) => Object.fromEntries(Object.entries(object || {}).map(([key, value]) => {
    if (typeof value === "bigint") return [key, Number(value)];
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return [key, Number(value)];
    return [key, value];
  }));
  return {
    ...health,
    pipeline: { articleStates: normalizeMetricRows(articleStates), processingStepStates: normalizeMetricRows(processingStates), recentFailureCount: Number(recentFailures?.count || 0) },
    backfill: { stepStates: normalizeMetricRows(backfillStates), lastUpdated: backfillLast?.last_updated || null },
    rss: numeric(rss),
    entityQuality: numeric(entityQuality),
    claimQuality: numeric(claimQuality),
    v2: numeric(v2),
    aiBudget: { ...numeric(ai), blocked_escalations: Number(aiDecisions?.blocked_escalations || 0) },
    retention: numeric(retention),
  };
}
async function inspectRecovery(connection, articleId, staleMs = DEFAULTS.articleStaleMs) {
  if (!Number.isSafeInteger(articleId) || articleId <= 0) throw new Error("invalid_article_id");
  const [articles] = await connection.execute(
    `SELECT id,status,worker_id,LEFT(claim_token,8) claim_ref,claimed_at,heartbeat_at,processing_attempts,failed_step,last_processing_error,
       (status='in_progress' AND heartbeat_at<UTC_TIMESTAMP(6)-INTERVAL ? MICROSECOND) is_stale
     FROM articles WHERE id=?`, [Math.trunc(staleMs * 1000), articleId]);
  if (!articles[0]) throw new Error("article_not_found");
  const [steps] = await connection.execute(
    `SELECT step_name,status,attempt_count,is_external,retryable,LEFT(operation_key,12) operation_ref,error_type,started_at,completed_at,last_error,
       result_json IS NOT NULL domain_result_recorded FROM article_processing_steps WHERE article_id=? ORDER BY step_name`, [articleId]);
  return { article: articles[0], steps, proposedAction: steps.some((step) => step.status === "uncertain") ? "operator_adjudication_required" : articles[0].status === "failed" ? "safe_retry_available_for_retryable_local_step" : "none" };
}

async function retryRecovery(connection, articleId, stepName, actor = "manual-cli") {
  if (!Number.isSafeInteger(articleId) || articleId <= 0 || !/^[a-z_]{2,64}$/.test(String(stepName || ""))) throw new Error("invalid_recovery_target");
  await connection.beginTransaction();
  try {
    const [rows] = await connection.execute(
      `SELECT a.status article_status,s.status step_status,s.is_external,s.retryable,LEFT(s.operation_key,12) operation_ref
       FROM articles a JOIN article_processing_steps s ON s.article_id=a.id WHERE a.id=? AND s.step_name=? FOR UPDATE`, [articleId, stepName]);
    const row = rows[0];
    if (!row) throw new Error("recovery_target_not_found");
    if (row.article_status !== "failed" || row.step_status !== "failed" || Number(row.is_external) !== 0 || Number(row.retryable) !== 1) throw new Error("recovery_not_safe_retryable");
    await connection.execute("UPDATE article_processing_steps SET status='pending',worker_id=NULL,claim_token=NULL,heartbeat_at=NULL,last_error=NULL WHERE article_id=? AND step_name=?", [articleId, stepName]);
    await connection.execute("UPDATE articles SET status='pending',worker_id=NULL,claim_token=NULL,claimed_at=NULL,heartbeat_at=NULL,failed_step=NULL,last_processing_error=NULL WHERE id=?", [articleId]);
    await connection.execute(
      "INSERT INTO recovery_audit_log (article_id,step_name,action,actor,previous_state,new_state,operation_ref,details_json) VALUES (?,?,'safe_retry',?,'failed','pending',?,JSON_OBJECT('automatic',false))",
      [articleId, stepName, String(actor).slice(0, 128), row.operation_ref || null],
    );
    await connection.commit();
    return { articleId, stepName, previousState: "failed", newState: "pending", auditRecorded: true };
  } catch (error) { await connection.rollback(); throw error; }
}

module.exports = { DEFAULTS, REQUIRED_SCHEMA, thresholds, redact, validateWorkerEnvironment, validateProductionEnvironment, checkSchemaReadiness, assertSchemaReadiness, registerWorker, heartbeatWorker, stopWorker, getHealthSnapshot, getOperationalSnapshot, normalizeMetricRows, inspectRecovery, retryRecovery };
