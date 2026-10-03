const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('app/api/insights/timeseries/route.ts', 'utf8');

assert.match(source, /period === "7d"/);
assert.match(source, /period === "30d"/);
assert.match(source, /period === "90d"/);
assert.match(source, /error: "invalid_period"/);
assert.match(source, /status: 400/);

console.log('timeseries period validation regression: PASS');
