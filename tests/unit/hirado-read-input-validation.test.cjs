const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = fs.readFileSync(
  path.join(__dirname, '../../app/api/hirado/read/[date]/route.ts'),
  'utf8',
);

assert.match(file, /INVALID_REPORT_PARAMETER/);
assert.match(file, /status: 400/);
assert.match(file, /hasReport: false/);

console.log('Híradó read input validation regression: PASS');
