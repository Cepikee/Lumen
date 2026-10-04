"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("scripts/v21-load-sanity.cjs", "utf8");

test("V2.1 load harness keeps the required concurrency ladder and stop condition", () => {
  assert.match(source, /10,25,50,100,250,500/);
  assert.match(source, /error-rate-threshold/);
  assert.match(source, /monitorEventLoopDelay/);
  assert.match(source, /p95Ms/);
  assert.match(source, /p99Ms/);
});

test("V2.1 load harness targets only local or explicitly supplied base URL", () => {
  assert.match(source, /127\.0\.0\.1:3011/);
  assert.match(source, /LOAD_BASE_URL/);
  assert.doesNotMatch(source, /utom\.hu/);
});

console.log("V2.1 load harness contract regression: PASS");
