const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app', 'api', 'hirado', 'read', '[date]', 'route.ts'),
  'utf8',
);

// Numeric route parameters are video IDs and must not be passed to MySQL when
// they overflow JS's safe integer range or are zero.
assert.match(source, /Number\.isSafeInteger\(Number\(param\)\)/);
assert.match(source, /Number\(param\) > 0/);
assert.match(source, /INVALID_VIDEO_ID/);
assert.match(source, /status: 400/);

console.log('hirado read video ID validation regression: PASS');
