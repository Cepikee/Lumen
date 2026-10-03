const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const route = fs.readFileSync(
  path.join(__dirname, '../../app/api/insights/route.ts'),
  'utf8',
);

assert.match(route, /Legacy summaries may exist without a canonical article relation/);
assert.match(route, /\.filter\(\(r: any\) => \{/);
assert.match(route, /Number\.isSafeInteger\(id\) && id > 0/);
assert.doesNotMatch(route, /items = \(rows \|\| \[\]\)\.slice\(0, 200\)\.map/);

console.log('insights null article link regression: PASS');
