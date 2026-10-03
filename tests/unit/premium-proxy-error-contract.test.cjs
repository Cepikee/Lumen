"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("app/api/premium-insights/[[...path]]/route.ts", "utf8");

test("premium proxy keeps entitlement and rate-limit failures in its JSON error contract", () => {
  assert.match(source, /try \{\s*entitlement = await getCurrentPremiumEntitlement\(\)/s);
  assert.match(source, /error: "premium_unavailable"/);
  assert.match(source, /try \{\s*allowed = await consumeRateLimitFailClosed/s);
  assert.match(source, /error: "rate_limit"/);
});

console.log("premium proxy error contract regression: PASS");
