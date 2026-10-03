const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/insights/timeseries/all/route.ts', 'utf8');

// Category discovery must use the same half-open window as the bucket query.
// Otherwise a category that only has historical rows is emitted with an empty
// series and appears as a misleading legend entry in the chart.
assert.match(
  source,
  /WHERE category IS NOT NULL AND category <> ''\s+AND created_at >= \?\s+AND created_at < \?/
);
assert.match(source, /`\s*,\s*\[startStr, endStr\]\);/);

console.log('timeseries all category window regression: PASS');
