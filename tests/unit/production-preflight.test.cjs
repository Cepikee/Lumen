"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { REQUIRED_SCHEMA, checkSchemaReadiness } = require("../../lib/operations");
const { loadMigrations } = require("../../db/migration-core.cjs");

function readinessExecutor(latest) {
  const tables = [
    "articles", "article_processing_steps", "speed_index_recalculation_jobs", "speed_index_history",
    "v2_entity_mentions", "v2_entity_alias_observations", "v2_ingestion_provenance", "schema_migrations",
    "worker_runtime_health", "recovery_audit_log", "user_sessions", "shared_rate_limits", "email_outbox",
  ];
  const columns = new Map([
    ["articles", ["worker_id", "claim_token", "heartbeat_at", "processing_attempts", "failed_step", "last_processing_error", "original_url", "external_id", "publication_time_source", "url_identity"]],
    ["article_processing_steps", ["operation_key", "is_external", "external_started_at", "error_type", "retryable"]],
    ["v2_entity_mentions", ["entity_type"]],
    ["v2_entity_alias_observations", ["alias_id", "mention_id", "normalization_version"]],
    ["speed_index_recalculation_jobs", ["generation", "completed_generation", "claimed_generation", "claim_token", "run_count"]],
  ]);
  const indexes = new Map([
    ["articles", ["idx_articles_recovery", "uq_articles_url_identity"]],
    ["article_processing_steps", ["uq_processing_steps_operation_key"]],
    ["speed_index_history", ["uq_speed_history_event_key"]],
    ["v2_ingestion_provenance", ["uq_v2_ingestion_provenance_operation_key"]],
  ]);
  return {
    async query(sql) {
      if (sql.includes("information_schema.TABLES")) return [tables.map((TABLE_NAME) => ({ TABLE_NAME }))];
      if (sql.includes("FROM schema_migrations")) return [[...Array(Number(latest))].map((_, index) => ({ version: String(index + 1).padStart(3, "0") }))];
      throw new Error(`unexpected_query:${sql}`);
    },
    async execute(sql, params) {
      if (sql.includes("information_schema.COLUMNS")) return [[...(columns.get(params[0]) || [])].map((COLUMN_NAME) => ({ COLUMN_NAME }))];
      if (sql.includes("information_schema.STATISTICS")) return [[...(indexes.get(params[0]) || [])].map((INDEX_NAME) => ({ INDEX_NAME }))];
      throw new Error(`unexpected_execute:${sql}`);
    },
  };
}

test("production preflight uses the canonical latest migration version", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../scripts/production-preflight.cjs"), "utf8");
  assert.match(source, /REQUIRED_SCHEMA\.latestVersion/);
  assert.doesNotMatch(source, /latestVersion === ["']033["']/);
  assert.equal(REQUIRED_SCHEMA.latestVersion, loadMigrations().at(-1).version);
});

test("active CI workflows use the supported Node major", () => {
  for (const file of ["ci.yml", "lint.yml", "depcheck.yml", "fetch-444.yml"]) {
    const source = fs.readFileSync(path.join(__dirname, "../../.github/workflows", file), "utf8");
    assert.doesNotMatch(source, /node-version:\s*['"]?(18|20)['"]?/);
    assert.match(source, /node-version:\s*['"]?24['"]?/);
  }
});

test("schema 058 is ready while 057 and future 059 fail closed", async () => {
  assert.equal((await checkSchemaReadiness(readinessExecutor(58))).ready, true);
  const old = await checkSchemaReadiness(readinessExecutor(57));
  assert.equal(old.ready, false);
  assert.ok(old.missing.includes("migration:58"));
  const future = await checkSchemaReadiness(readinessExecutor(59));
  assert.equal(future.ready, false);
  assert.ok(future.missing.includes("unsupported_schema_version:059"));
});

console.log("production preflight schema regression: PASS");
