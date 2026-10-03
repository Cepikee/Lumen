"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { RESOLUTION_POLICY, applyResolutionPolicy } = require("../../lib/v2/entity-resolution-policy");
const { resolveExactEntity } = require("../../lib/v2/entity-resolution-repository");

const hit = { status: "resolved", matchType: "canonical", entityId: 1, candidates: [] };

test("Q06 policy keeps one canonical source of truth and exact boundaries", () => {
  assert.deepEqual(RESOLUTION_POLICY, { autoResolveMin: 0.95, reviewMin: 0.80 });
  assert.equal(applyResolutionPolicy(hit, 0.95).resolutionStatus, "resolved_exact");
  assert.equal(applyResolutionPolicy(hit, 0.9499).resolutionStatus, "review");
  assert.equal(applyResolutionPolicy(hit, 0.80).resolutionStatus, "review");
  assert.equal(applyResolutionPolicy(hit, 0.7999).resolutionStatus, "unresolved");
  assert.equal(applyResolutionPolicy(hit, 0).resolutionStatus, "unresolved");
  assert.equal(applyResolutionPolicy(hit, 1).resolutionStatus, "resolved_exact");
});

test("Q06 ambiguity always wins over confidence and no-match never creates an entity", () => {
  assert.equal(applyResolutionPolicy({ status: "ambiguous", candidates: [{ entityId: 1 }, { entityId: 2 }] }, 1).resolutionStatus, "ambiguous");
  assert.equal(applyResolutionPolicy({ status: "unresolved", candidates: [] }, 1).resolutionStatus, "unresolved");
});

test("Q06 feature OFF performs no lookup and no side effect", async () => {
  let calls = 0;
  const result = await resolveExactEntity({ execute: async () => { calls += 1; } }, { name: "Acme", entityType: "company", confidence: 1, enabled: false });
  assert.equal(result.resolutionStatus, "disabled");
  assert.equal(calls, 0);
});

test("Q06 invalid confidence remains rejected", () => {
  for (const value of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, "0.95", null]) {
    assert.throws(() => applyResolutionPolicy(hit, value), /confidence_invalid/);
  }
});

console.log("Q06 confidence policy regression: PASS");
