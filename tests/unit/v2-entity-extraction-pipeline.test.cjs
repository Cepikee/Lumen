"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("M4 has one feature-gated canonical pipeline handoff and no route/duplicate invocation", () => {
  const source = fs.readFileSync("pipeline/cron.js", "utf8");
  assert.equal((source.match(/runEntityExtraction\(/g) || []).length, 1);
  assert.match(source, /if \(isV2Enabled\(\)\)/);
  assert.match(source, /createIngestionEnvelope/);
  assert.match(source, /persistEntityExtraction/);
  assert.match(source, /entity_extraction/);
});

test("M4 extraction is optional and cannot make legacy completion a required V2 step", () => {
  const source = fs.readFileSync("pipeline/state-machine.js", "utf8");
  assert.match(source, /OPTIONAL_STEPS = Object\.freeze\(\["sentiment", "entity_extraction"\]\)/);
  assert.doesNotMatch(source, /REQUIRED_STEPS = Object\.freeze\(\[[^\]]*entity_extraction/);
});
