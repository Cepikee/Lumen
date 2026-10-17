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
  assert.equal(loadMigrations().at(-1).version, "064");
});

test("worker only queues completed published articles and all terminal writes are claim fenced", () => {
  const repository = fs.readFileSync("lib/article-images/repository.js", "utf8");
  assert.match(repository, /status='done' AND processed=1/);
  assert.match(repository, /FOR UPDATE SKIP LOCKED/);
  assert.match(repository, /WHERE article_id=\? AND image_status='generating' AND worker_id=\? AND claim_token=\?/g);
  assert.match(repository, /image_generation_daily_usage[\s\S]*FOR UPDATE/);
  assert.match(repository, /reserved_neurons=reserved_neurons-\?[\s\S]*reserved_neurons>=\?/);
});

test("real provider smoke is double gated and normal worker is disabled by default", () => {
  const smoke = fs.readFileSync("scripts/cloudflare-image-smoke.cjs", "utf8");
  const env = fs.readFileSync(".env.example", "utf8");
  assert.match(smoke, /RUN_CLOUDFLARE_IMAGE_SMOKE !== "1"/);
  assert.match(smoke, /IMAGE_GEN_ENABLED !== "true"/);
  assert.match(env, /IMAGE_GEN_ENABLED=false/);
  assert.match(env, /RUN_CLOUDFLARE_IMAGE_SMOKE=0/);
});
