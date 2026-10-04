"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { redact, validateWorkerEnvironment, validateProductionEnvironment, checkSchemaReadiness, getHealthSnapshot } = require("../../lib/operations");
const { loadMigrations, auditMigrationChain } = require("../../db/migration-core.cjs");
const { isValidInternalToken } = require("../../lib/security/internal-token");

test("migration chain is contiguous and statically rollout-auditable", () => {
  const audit = auditMigrationChain(loadMigrations());
  assert.equal(audit.migrationCount, loadMigrations().length);
  assert.equal(audit.latestVersion, loadMigrations().at(-1).version);
  assert.equal(audit.safeToApply, true);
  assert.equal(audit.findings.some((item) => item.level === "critical"), false);
});

test("operational redaction removes credentials and bearer-like secrets", () => {
  const output = redact("mysql://user:p4ss@example/db Authorization=Bearer-secret API_KEY=sk-secret password=hunter2");
  for (const secret of ["p4ss", "Bearer-secret", "sk-secret", "hunter2"]) assert.equal(output.includes(secret), false);
});

test("worker environment is fail-safe and offline mode does not require OpenAI", () => {
  const base = { DB_HOST: "127.0.0.1", DB_USER: "test", DB_PASSWORD: "test", DB_NAME: "test", UTOM_OFFLINE_MODE: "true" };
  assert.equal(validateWorkerEnvironment(base).aiProvider, "mock");
  assert.throws(() => validateWorkerEnvironment({ ...base, DB_PASSWORD: "" }), /worker_environment_missing/);
  assert.throws(() => validateWorkerEnvironment({ ...base, UTOM_OFFLINE_MODE: "false" }), /background_jobs_not_explicitly_enabled/);
  assert.throws(() => validateWorkerEnvironment({ ...base, UTOM_OFFLINE_MODE: "false", BACKGROUND_JOBS_ENABLED: "true", AI_PROVIDER: "openai", REAL_AI_ENABLED: "true" }), /openai_api_key_missing/);
});

test("production environment requires explicit side effects and their secret categories", () => {
  const valid = { DB_HOST: "db", DB_USER: "app", DB_PASSWORD: "secret", DB_NAME: "utom", UTOM_OFFLINE_MODE: "false", BACKGROUND_JOBS_ENABLED: "true", NODE_ENV: "production", APP_MODE: "production", UTOM_PAID_AI_ENABLED: "true", AI_PROVIDER: "openai", REAL_AI_ENABLED: "true", OPENAI_API_KEY: "test-marker", UTOM_INTERNAL_WORKER_TOKEN: "x".repeat(32), EMAIL_OUTBOX_ENCRYPTION_KEY: "ab".repeat(32) };
  assert.equal(validateProductionEnvironment(valid).aiProvider, "openai");
  assert.throws(() => validateProductionEnvironment({ ...valid, OPENAI_API_KEY: "" }), /production_real_ai_configuration_missing|openai_api_key_missing/);
  assert.throws(() => validateProductionEnvironment({ ...valid, UTOM_INTERNAL_WORKER_TOKEN: "short" }), /production_health_token_missing_or_short/);
  assert.throws(() => validateProductionEnvironment({ ...valid, EMAIL_OUTBOX_ENCRYPTION_KEY: "short" }), /production_email_outbox_key_missing_or_invalid/);
  assert.throws(() => validateProductionEnvironment({ ...valid, EMAIL_SEND_ENABLED: "true" }), /production_mail_configuration_missing/);
  assert.throws(() => validateProductionEnvironment({ ...valid, PAYMENT_ENABLED: "true" }), /production_payment_configuration_missing/);
  assert.throws(() => validateProductionEnvironment({ ...valid, VIDEO_GENERATION_ENABLED: "true" }), /production_video_configuration_missing/);
});

test("production environment allows paid AI to remain disabled without a provider key", () => {
  const offlineAi = { DB_HOST: "db", DB_USER: "app", DB_PASSWORD: "secret", DB_NAME: "utom", UTOM_OFFLINE_MODE: "false", BACKGROUND_JOBS_ENABLED: "true", NODE_ENV: "production", APP_MODE: "production", UTOM_PAID_AI_ENABLED: "false", AI_PROVIDER: "mock", REAL_AI_ENABLED: "false", UTOM_INTERNAL_WORKER_TOKEN: "x".repeat(32), EMAIL_OUTBOX_ENCRYPTION_KEY: "ab".repeat(32) };
  assert.equal(validateProductionEnvironment(offlineAi).paidAiEnabled, false);
  assert.throws(() => validateProductionEnvironment({ ...offlineAi, UTOM_PAID_AI_ENABLED: "true" }), /production_ai_provider_must_be_explicit/);
});

test("internal health authentication rejects anonymous and malformed credentials", () => {
  const token = "a".repeat(32);
  assert.equal(isValidInternalToken(null, token), false);
  assert.equal(isValidInternalToken("Bearer short", token), false);
  assert.equal(isValidInternalToken(`Bearer ${token}`, token), true);
  assert.equal(isValidInternalToken(`Bearer ${token}`, "too-short"), false);
});

test("startup and health fail closed when the database is unavailable", async () => {
  const unavailable = { query: async () => { throw new Error("connect ECONNREFUSED password=hidden"); } };
  await assert.rejects(checkSchemaReadiness(unavailable), /ECONNREFUSED/);
  await assert.rejects(getHealthSnapshot(unavailable), /ECONNREFUSED/);
});
