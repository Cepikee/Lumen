const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/trends/route.ts', 'utf8');

// Filtered trend results must include legacy values with surrounding
// whitespace, consistently in realtime, current and growth subqueries.
assert.ok((route.match(/LOWER\(TRIM\(COALESCE\(/g) || []).length >= 6);

console.log('trends canonical filter contract tests passed');
