const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/forecast-status/route.ts', 'utf8');

assert.match(source, /new Date\(row\.finished_at\)/);
assert.match(source, /Number\.isNaN\(lastRun\.getTime\(\)\)/);
assert.match(source, /status: "unknown"[\s\S]*lastRun: null[\s\S]*nextRun: null/);

console.log('forecast invalid timestamp regression: PASS');
