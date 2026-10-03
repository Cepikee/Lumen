const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app/api/insights/category/[category]/route.ts', 'utf8');
assert.match(source, /error: "invalid_period"/);
assert.match(source, /error: "invalid_sort"/);
assert.match(source, /requestedPage <= 100_000/);
assert.match(source, /\["latest", "popular"\]/);
assert.match(source, /a\.published_at DESC, a\.id DESC/,
  'latest category pagination must use a unique article tie-breaker');
assert.match(source, /a\.score DESC, a\.published_at DESC, a\.id DESC/,
  'popular category pagination must use a unique article tie-breaker');
assert.match(source, /ORDER BY cnt DESC, source ASC/,
  'source distribution ordering must be deterministic for tied counts');
console.log('category period/sort validation regression: PASS');
