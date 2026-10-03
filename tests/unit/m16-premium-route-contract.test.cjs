"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("app/api/v2/premium/intelligence/route.ts", "utf8");

test("M16 route gates V2 before entitlement and maps anonymous/non-premium states", () => {
  assert.match(source, /if \(!isV2Enabled\(\)\).*status: 404/s);
  assert.match(source, /reason === "not_authenticated".*status: 401/s);
  assert.match(source, /!entitlement\.active.*status: 403/s);
  assert.doesNotMatch(source, /searchParams\.get\("is_premium"\)/);
});

test("M16 route uses the canonical source comparison and timeline projections", () => {
  assert.match(source, /compareSourcesDetailed\(db/);
  assert.match(source, /readTimelineItems\(db/);
  assert.match(source, /projectPremiumIntelligence/);
  assert.doesNotMatch(source, /winnerSourceId|trustScore|biasScore/);
});

console.log("M16 premium route contract regression: PASS");
