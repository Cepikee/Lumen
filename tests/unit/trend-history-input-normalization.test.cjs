const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = fs.readFileSync(
  path.join(__dirname, '../../app/api/trend-history/route.ts'),
  'utf8',
);

assert.match(file, /searchParams\.get\("keyword"\)\?\.trim\(\)/);
assert.match(file, /new Set\(sources\.split\(.*map\(\(s\) => s\.trim\(\)\)/s);
assert.match(file, /isRealIsoDate/);
assert.match(file, /getUTCFullYear\(\) === year/);

console.log('Trend history input normalization regression: PASS');
