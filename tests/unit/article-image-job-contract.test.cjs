"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { loadMigrations } = require("../../db/migration-core.cjs");

test("image job schema is unique per article and carries lease, fingerprint and budget state", () => {
  const imageMigration = fs.readFileSync("db/migrations/063_article_images.sql", "utf8");
  const budgetMigration = fs.readFileSync("db/migrations/064_image_generation_daily_usage.sql", "utf8");
  assert.match(imageMigration, /PRIMARY KEY \(article_id\)/);
  assert.match(imageMigration, /claim_token CHAR\(36\)/);
  assert.match(imageMigration, /fingerprint CHAR\(64\)/);
  assert.match(imageMigration, /FOREIGN KEY \(article_id\) REFERENCES articles\(id\) ON DELETE CASCADE/);
  assert.match(budgetMigration, /PRIMARY KEY \(usage_date, provider\)/);
  assert.equal(loadMigrations().at(-1).version, "066");
});

test("worker only queues completed published articles and all terminal writes are claim fenced", () => {
  const repository = fs.readFileSync("lib/article-images/repository.js", "utf8");
  const policy = fs.readFileSync("lib/article-images/policy.js", "utf8");
  assert.match(repository, /a\.status='done' AND a\.processed=1/);
  assert.match(repository, /a\.id>\?/);
  assert.match(repository, /a\.id>\? OR ai\.force_revision>0/);
  assert.match(repository, /image_rollout_cutoff_required/);
  assert.match(repository, /FOR UPDATE SKIP LOCKED/);
  assert.match(repository, /WHERE article_id=\? AND image_status='generating' AND worker_id=\? AND claim_token=\?/g);
  assert.match(repository, /image_generation_daily_usage[\s\S]*FOR UPDATE/);
  assert.match(repository, /reserved_neurons=reserved_neurons-\?[\s\S]*reserved_neurons>=\?/);
  assert.doesNotMatch(`${repository}\n${policy}`, /image_generation_disabled/, "runtime image policy must use only canonical schema fields");
});

test("real provider smoke is double gated and normal worker is disabled by default", () => {
  const smoke = fs.readFileSync("scripts/cloudflare-image-smoke.cjs", "utf8");
  const env = fs.readFileSync(".env.example", "utf8");
  assert.match(smoke, /RUN_CLOUDFLARE_IMAGE_SMOKE !== "1"/);
  assert.match(smoke, /IMAGE_GEN_ENABLED !== "true"/);
  assert.match(env, /IMAGE_GEN_ENABLED=false/);
  assert.match(env, /RUN_CLOUDFLARE_IMAGE_SMOKE=0/);
});

test("continuous image work stays outside the canonical article completion path", () => {
  const stateMachine = fs.readFileSync("pipeline/state-machine.js", "utf8");
  const worker = fs.readFileSync("pipeline/image-worker.js", "utf8");
  const smoke = fs.readFileSync("scripts/cloudflare-image-smoke.cjs", "utf8");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.doesNotMatch(stateMachine, /article-images|image-worker|CloudflareImage/i);
  assert.match(worker, /await runContinuous\(\)/);
  assert.match(worker, /process\.argv\.includes\("--once"\)/);
  assert.match(smoke, /runOnce\(/);
  assert.equal(packageJson.scripts["image:worker"], "node pipeline/image-worker.js");
  assert.equal(packageJson.scripts["image:worker:once"], "node pipeline/image-worker.js --once");
});
