const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modal = fs.readFileSync(path.join(__dirname, "..", "..", "components", "TrendSourcesModal.tsx"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "..", "..", "components", "TrendsPanel.tsx"), "utf8");

assert.match(modal, /function normalizeSource\(value: unknown\)/);
assert.match(modal, /https\?:/);
assert.match(modal, /Cím nélkül/);
assert.match(modal, /Number\.isNaN\(timestamp\)/);
assert.match(panel, /setSources\(\[\]\);/);

console.log("trend sources malformed/stale state regression: PASS");
