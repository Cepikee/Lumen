"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const route = fs.readFileSync("app/api/trends/stats/route.ts", "utf8");

// SQL/driver messages are implementation details and must not become the
// public response contract when the statistics query fails.
assert.match(route, /error: "trends_stats_failed"/);
assert.doesNotMatch(route, /NextResponse\.json\(\{ error: err\.message \}/);

console.log("trends stats error contract regression: PASS");
