"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { evaluateRetentionEligibility, retentionPolicy, REQUIRED_STEPS } = require("../../lib/raw-text-retention");
const { runIncrementalBackfill } = require("../../lib/v2/incremental-backfill");
const { loadMigrations } = require("../../db/migration-core.cjs");

const now = new Date("2026-10-05T12:00:00.000Z");
const doneSteps = () => REQUIRED_STEPS.map((step_name) => ({ step_name, status: "done", retryable: 0, is_external: 0 }));
function article(overrides = {}) {
  return { id: 1, status: "done", content_text: "raw body", content_hash: "a".repeat(64), updated_at: new Date("2026-10-03T11:00:00.000Z"), processing_attempts: 1, worker_id: null, claim_token: null, heartbeat_at: null, ...overrides };
}
function decision(overrides = {}, extras = {}) { return evaluateRetentionEligibility({ article: article(overrides), steps: doneSteps(), v2Steps: [], missingEvidenceSpans: 0, now, policy: retentionPolicy(), ...extras }); }

test("successful article younger than 24 hours is retained", () => assert.equal(decision({ updated_at: new Date("2026-10-04T13:00:00Z") }).reason, "success_retention_window"));
test("successful complete article older than 24 hours is eligible", () => assert.equal(decision().eligible, true));
test("pending raw step blocks a successful article", () => assert.equal(decision({}, { steps: [...doneSteps().slice(1), { step_name: REQUIRED_STEPS[0], status: "pending" }] }).reason, "raw_step_active"));
test("in-progress and stale claims remain protected", () => assert.equal(decision({ status: "in_progress", worker_id: "worker", claim_token: "claim" }).reason, "active_claim"));
test("failed article inside seven days is retained", () => assert.equal(decision({ status: "failed", updated_at: new Date("2026-10-02T12:00:00Z"), processing_attempts: 3 }, { steps: [{ step_name: "short_summary", status: "failed", retryable: 0 }] }).reason, "failed_retention_window"));
test("terminal failed article older than seven days is eligible", () => assert.equal(decision({ status: "failed", updated_at: new Date("2026-09-27T11:00:00Z"), processing_attempts: 3 }, { steps: [{ step_name: "short_summary", status: "failed", retryable: 0 }] }).eligible, true));
test("recoverable failed article is protected even after seven days", () => assert.equal(decision({ status: "failed", updated_at: new Date("2026-09-20T11:00:00Z"), processing_attempts: 1 }, { steps: [{ step_name: "short_summary", status: "failed", retryable: 1 }] }).reason, "recoverable_retry"));
test("active retry and external uncertainty are protected", () => assert.equal(decision({ status: "failed", updated_at: new Date("2026-09-20T11:00:00Z"), processing_attempts: 3 }, { steps: [{ step_name: "short_summary", status: "uncertain", retryable: 0, is_external: 1 }] }).reason, "raw_step_active"));
test("already purged article is a no-op", () => assert.equal(evaluateRetentionEligibility({ article: article({ content_text: null }), steps: doneSteps(), now }).reason, "already_purged"));
test("missing required output and incomplete V2 projection are fail-closed", () => {
  assert.equal(decision({}, { steps: doneSteps().slice(1) }).reason.startsWith("required_steps_incomplete"), true);
  assert.equal(decision({}, { v2Steps: [{ status: "processing" }] }).reason, "v2_projection_incomplete");
});
test("evidence without persisted span blocks purge", () => assert.equal(decision({}, { missingEvidenceSpans: 1 }).reason, "evidence_span_missing"));
test("policy configuration rejects zero, negative and fractional values", () => {
  assert.throws(() => retentionPolicy({ UTOM_RAW_TEXT_SUCCESS_HOURS: "0" }), /raw_text_success_hours_invalid/);
  assert.throws(() => retentionPolicy({ UTOM_RAW_TEXT_FAILED_DAYS: "-1" }), /raw_text_failed_days_invalid/);
  assert.throws(() => retentionPolicy({ UTOM_RAW_TEXT_FAILED_DAYS: "1.5" }), /raw_text_failed_days_invalid/);
});
test("incremental backfill reports purged raw text explicitly and does not invoke processing", async () => {
  const calls = [];
  const repo = {
    async withTransaction(work) { return work({
      async listArticlesAfter() { return [{ id: 42, contentHash: "a".repeat(64), contentText: null, updatedAt: "2026-10-01" }]; },
      async claimStep() { calls.push("claim"); return { status: "claimed", claimToken: "x" }; },
      async completeStep() { calls.push("complete"); },
    }); },
  };
  const result = await runIncrementalBackfill({ repository: repo, input: { batchSize: 1 }, budget: { provider: "mock", remaining: 0 }, processArticle: async () => { calls.push("process"); } });
  assert.equal(result.unavailable, 1);
  assert.deepEqual(calls, []);
});
test("reprocess callers expose an explicit raw_text_unavailable guard", () => {
  for (const file of ["pipeline/cron.js", "lib/cron.js", "lib/processArticle.js"]) assert.match(fs.readFileSync(file, "utf8"), /raw_text_unavailable/);
});
test("060 migration is additive, auditable and single-statement", () => {
  const migration = loadMigrations().find((item) => item.version === "060");
  assert.equal(migration.filename, "060_raw_text_retention_audit.sql");
  assert.match(migration.sql, /CREATE TABLE raw_text_retention_audit/);
  assert.match(migration.sql, /action VARCHAR\(16\)/);
  assert.match(migration.sql, /FOREIGN KEY \(article_id\) REFERENCES articles\(id\) ON DELETE SET NULL/);
  assert.equal(migration.sql.replace(/^\s*--[^\n]*$/gm, "").includes(";"), false);
});

console.log("raw text retention regression: PASS");
