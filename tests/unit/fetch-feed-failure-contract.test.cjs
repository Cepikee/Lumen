const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/fetch-feed/route.ts', 'utf8');
assert.match(source, /let feedAttempts = 0/);
assert.match(source, /let feedFailures = 0/);
assert.match(source, /feedAttempts > 0 && feedFailures === feedAttempts/);
assert.match(source, /status: 502/);
assert.match(source, /feedAttempts,\s*feedFailures/);

console.log('fetch-feed total failure response regression: PASS');
