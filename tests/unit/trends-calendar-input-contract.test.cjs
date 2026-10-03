const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/trends/route.ts', 'utf8');

// Shape-only checks accept dates such as 2025-02-31, which can silently turn
// a valid custom request into an empty or shifted SQL range.
assert.match(route, /function isCalendarDate\(value: string\): boolean/);
assert.match(route, /getUTCFullYear\(\) === year/);
assert.match(route, /!isCalendarDate\(startDate\) \|\| !isCalendarDate\(endDate\)/);

console.log('trends calendar input contract tests passed');
