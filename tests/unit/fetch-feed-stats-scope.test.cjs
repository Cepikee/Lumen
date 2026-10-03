const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app', 'api', 'fetch-feed', 'route.ts'),
  'utf8',
);

// Feed stats belong to one POST run. A module-level mutable counter would leak
// counts from an earlier request into every later response.
assert.match(source, /const feedStats: Record<string, number> = \{/);
assert.doesNotMatch(source, /export const feedStats/);
assert.ok(
  source.indexOf('const feedStats: Record<string, number> = {') >
    source.indexOf('export async function POST'),
  'feedStats must be initialized inside POST',
);

console.log('fetch-feed per-request stats regression: PASS');
