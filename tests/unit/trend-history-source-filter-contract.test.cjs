const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/trend-history/route.ts', 'utf8');

// The trends UI treats source filters case-insensitively. Both the hourly and
// daily history queries must apply the same semantics to legacy DB values.
assert.strictEqual((route.match(/LOWER\(TRIM\(source\)\) IN/g) || []).length, 2);
assert.strictEqual((route.match(/source\.toLowerCase\(\)/g) || []).length, 2);

console.log('trend history source filter contract tests passed');
