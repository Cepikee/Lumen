"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("canonical pipeline invokes one V2 orchestrator only after durable V1 completion", () => {
  const source = fs.readFileSync("pipeline/cron.js", "utf8");
  assert.equal((source.match(/runV2ShadowIntelligence\(/g) || []).length, 1);
  assert.doesNotMatch(source, /runEntityExtraction\(/);
  const batch = source.slice(source.indexOf("async function processBatch"), source.indexOf("async function fetchFeedInternally"));
  const finish = batch.indexOf("await pipelineState.finishArticle(claim)");
  const shadow = batch.indexOf("await runPostCompletionShadow(article.id)");
  assert.ok(finish >= 0 && shadow > finish, "V1 completion must be durable before V2 shadow starts");
});

test("post-completion boundary contains unexpected shadow failures", () => {
  const source = fs.readFileSync("pipeline/cron.js", "utf8");
  const boundary = source.slice(source.indexOf("async function runPostCompletionShadow"), source.indexOf("async function processBatch"));
  assert.match(boundary, /try\s*\{/);
  assert.match(boundary, /catch \(error\)/);
  assert.match(boundary, /return \{ status: "failed"/);
});

test("legacy optional entity step remains accepted for resumability but is no longer invoked", () => {
  const source = fs.readFileSync("pipeline/state-machine.js", "utf8");
  assert.match(source, /OPTIONAL_STEPS = Object\.freeze\(\["sentiment", "entity_extraction"\]\)/);
  assert.doesNotMatch(source, /REQUIRED_STEPS = Object\.freeze\(\[[^\]]*entity_extraction/);
});
