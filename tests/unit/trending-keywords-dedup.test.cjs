const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('app/api/insights/trending-keywords/route.ts', 'utf8');
assert.match(source, /new Set<string>\(raw\.split\("[,]"\)/);
assert.match(source, /localeCompare\(b\[0\], "hu"\)/);
console.log('trending keywords per-article dedup regression: PASS');
