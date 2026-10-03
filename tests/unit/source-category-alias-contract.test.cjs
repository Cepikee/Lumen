"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const route = fs.readFileSync(
  "app/api/insights/source-category-distribution/route.ts",
  "utf8",
);

// Source rows and incoming domain filters must share the canonical source key,
// otherwise a legacy `24hu` row cannot be selected with the UI's `24.hu` key.
assert.match(route, /normalizeSourceIdentity\(rawDomain\)\?\.key/);
assert.match(route, /normalizeSourceIdentity\(rawSource\)\?\.key/);

console.log("source-category alias contract regression: PASS");
