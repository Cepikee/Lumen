"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePremium } = require("../../lib/entitlements-core");

const now = new Date("2026-09-27T12:00:00Z");

test("premium entitlement requires the premium flag", () => {
  assert.equal(evaluatePremium({ is_premium: 0, premium_until: "2099-01-01" }, now).active, false);
});

test("premium entitlement rejects an expired subscription", () => {
  const result = evaluatePremium({ is_premium: 1, premium_until: "2026-09-26T00:00:00Z" }, now);
  assert.equal(result.active, false);
  assert.equal(result.reason, "expired");
});

test("premium entitlement accepts an active or non-expiring flagged subscription", () => {
  assert.equal(evaluatePremium({ is_premium: 1, premium_until: "2026-10-01T00:00:00Z" }, now).active, true);
  assert.equal(evaluatePremium({ is_premium: true, premium_until: null }, now).active, true);
});
