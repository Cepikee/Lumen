#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { cleanupExpiredRateLimits } = require("../lib/shared-rate-limit");
const { runRetentionBatch } = require("../lib/raw-text-retention");
const { validateWorkerEnvironment, assertSchemaReadiness, redact } = require("../lib/operations");

const MAX_BATCH = 5000;

function positiveInteger(value, fallback, maximum = MAX_BATCH) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

function databaseConfig(env = process.env) {
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((name) => !String(env[name] || "").trim());
  if (missing.length) throw new Error(`maintenance_environment_missing:${missing.join(",")}`);
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: 2,
  };
}

async function deleteBatch(pool, table, predicate, limit) {
  const allowed = new Set([
    "user_sessions", "password_reset_tokens", "pin_reset_tokens", "login_attempts",
    "password_reset_requests", "pin_reset_requests", "video_access_logs", "email_outbox",
  ]);
  if (!allowed.has(table)) throw new Error("maintenance_table_not_allowed");
  const [result] = await pool.query(`DELETE FROM ${table} WHERE ${predicate} LIMIT ${limit}`);
  return Number(result.affectedRows || 0);
}

async function runMaintenance(pool, options = {}) {
  const env = options.env || process.env;
  const batch = positiveInteger(env.MAINTENANCE_BATCH_SIZE, 1000);
  const days = (name, fallback) => positiveInteger(env[name], fallback, 3650);
  const deleted = {
    shared_rate_limits: await cleanupExpiredRateLimits(pool, batch),
    user_sessions: await deleteBatch(pool, "user_sessions", "expires_at < UTC_TIMESTAMP(6)", batch),
    password_reset_tokens: await deleteBatch(pool, "password_reset_tokens", "expiresAt < UTC_TIMESTAMP()", batch),
    pin_reset_tokens: await deleteBatch(pool, "pin_reset_tokens", "expiresAt < UTC_TIMESTAMP()", batch),
    login_attempts: await deleteBatch(pool, "login_attempts", `created_at < UTC_TIMESTAMP() - INTERVAL ${days("LOGIN_ATTEMPT_RETENTION_DAYS", 30)} DAY`, batch),
    password_reset_requests: await deleteBatch(pool, "password_reset_requests", `created_at < UTC_TIMESTAMP() - INTERVAL ${days("RESET_REQUEST_RETENTION_DAYS", 30)} DAY`, batch),
    pin_reset_requests: await deleteBatch(pool, "pin_reset_requests", `created_at < UTC_TIMESTAMP() - INTERVAL ${days("RESET_REQUEST_RETENTION_DAYS", 30)} DAY`, batch),
    video_access_logs: await deleteBatch(pool, "video_access_logs", `created_at < UTC_TIMESTAMP() - INTERVAL ${days("VIDEO_ACCESS_LOG_RETENTION_DAYS", 90)} DAY`, batch),
    email_outbox: await deleteBatch(pool, "email_outbox", `status='sent' AND sent_at < UTC_TIMESTAMP(6) - INTERVAL ${days("EMAIL_OUTBOX_RETENTION_DAYS", 30)} DAY`, batch),
  };

  let rawTextRetention = { status: "disabled" };
  if (String(env.UTOM_RETENTION_EXECUTE || "").toLowerCase() === "true") {
    rawTextRetention = await runRetentionBatch(pool, {
      dryRun: false,
      batchSize: positiveInteger(env.RETENTION_BATCH_SIZE, 100, 1000),
      workerId: env.UTOM_RETENTION_WORKER_ID,
      env,
    });
  }
  return { deleted, rawTextRetention };
}

async function main() {
  validateWorkerEnvironment(process.env);
  const pool = mysql.createPool(databaseConfig());
  try {
    await assertSchemaReadiness(pool);
    const result = await runMaintenance(pool);
    console.log(JSON.stringify({ event: "maintenance_completed", ...result }));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ event: "maintenance_failed", error: redact(error.message) }));
    process.exitCode = 1;
  });
}

module.exports = { databaseConfig, positiveInteger, runMaintenance };
