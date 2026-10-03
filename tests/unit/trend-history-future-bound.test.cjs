const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/trend-history/route.ts', 'utf8');
const intervalBranch = source.slice(
  source.indexOf('if (period !== "custom" && intervalValue)'),
  source.indexOf('if (period === "custom" && startDate && endDate)')
);
const customBranch = source.slice(
  source.indexOf('if (period === "custom" && startDate && endDate)'),
  source.lastIndexOf('if (sourceList.length > 0)')
);

assert.match(intervalBranch, /created_at < UTC_TIMESTAMP\(\)/);
assert.match(customBranch, /created_at < UTC_TIMESTAMP\(\)/);
console.log('trend-history future-date upper-bound regression: PASS');
