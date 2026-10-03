const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('app/api/insights/timeseries/route.ts', 'utf8');
assert.match(source, /created_at >= \?/);
assert.match(source, /created_at < \?/);
assert.match(source, /\[category, startStr, mysqlUtc\(now\)\]/);
console.log('timeseries future-date upper-bound regression: PASS');
