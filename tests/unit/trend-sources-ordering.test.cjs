const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = fs.readFileSync(
  path.join(__dirname, '../../app/api/trends/trend-sources/route.ts'),
  'utf8',
);

assert.match(file, /ORDER BY a\.published_at DESC, a\.id DESC/);
console.log('Trend sources deterministic ordering regression: PASS');
