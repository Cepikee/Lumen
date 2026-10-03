const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/summaries/route.ts', 'utf8');

// Search/feed pagination must honor a valid limit and cap it. A hard-coded
// LIMIT 10 silently ignored callers requesting another page size.
assert.match(source, /parsePositiveInt\(searchParams\.get\("limit"\), 10\)/);
assert.match(source, /const limit = Math\.min\([\s\S]*?,\s*100\s*\);/);

console.log('summaries pagination limit contract regression: PASS');
