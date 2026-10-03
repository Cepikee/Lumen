const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/insights/forecast/route.ts', 'utf8');

// Forecast categories must match the frontend's canonical labels even when
// historical rows contain case or surrounding whitespace differences.
assert.match(route, /toLocaleLowerCase\("hu-HU"\)/);
assert.match(route, /CATEGORY_LABELS\.get\(key\) \?\? "Ismeretlen"/);

// Invalid dates and non-finite/negative predictions must not reach the chart.
assert.match(route, /if \(!date \|\| !Number\.isFinite\(predicted\) \|\| predicted < 0\) continue/);
assert.match(route, /\n\s+date,\n/);
assert.match(route, /\n\s+predicted,\n/);

console.log('forecast response contract tests passed');
