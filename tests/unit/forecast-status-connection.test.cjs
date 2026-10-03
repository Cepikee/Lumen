const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app/api/forecast-status/route.ts', 'utf8');
assert.match(source, /let conn: mysql\.Connection \| null = null/);
assert.match(source, /finally \{[\s\S]*await conn\.end\(\)/);
console.log('forecast status connection cleanup regression: PASS');
