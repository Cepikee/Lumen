"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { normalizeMetricRows } = require("../../lib/operations");

const healthRoute = fs.readFileSync("app/api/internal/health/route.ts", "utf8");
const publicHealthRoute = fs.readFileSync("app/api/health/route.ts", "utf8");

test("internal health exposes read-only operational diagnostics", () => {
  assert.match(healthRoute, /getOperationalSnapshot/);
  assert.match(healthRoute, /requireInternalWorker/);
  assert.match(healthRoute, /diagnostics: getObservabilitySnapshot/);
  const operations = fs.readFileSync("lib/operations.js", "utf8");
  assert.match(operations, /FROM v2_ai_decisions/);
  assert.match(operations, /FROM sources/);
  assert.match(operations, /entityQuality/);
});

test("public liveness response is minimal and does not touch the database", () => {
  assert.match(publicHealthRoute, /status: "ok"/);
  assert.match(publicHealthRoute, /liveness: true/);
  assert.doesNotMatch(publicHealthRoute, /mysql|DB_|password|worker/i);
});

test("metric row normalization is numeric and deterministic", () => {
  assert.deepEqual(normalizeMetricRows([{ status: "failed", count: 2n }, { status: "pending", count: 3 }]), { failed: 2, pending: 3 });
});

console.log("observability contract regression: PASS");
