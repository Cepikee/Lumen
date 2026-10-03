const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const trends = read('app/api/trends/route.ts');
const sources = read('app/api/trends/trend-sources/route.ts');
const history = read('app/api/trend-history/route.ts');
const related = read('app/api/related/route.ts');
const timeseries = read('app/api/insights/timeseries/all/route.ts');

assert.match(trends, /allowedPeriods = new Set/);
assert.match(trends, /Érvénytelen időszak/);
assert.match(trends, /Érvénytelen dátumtartomány/);
assert.match(trends, /t2\.category <=> t\.category/);
assert.match(trends, /historicalFilters/);
assert.match(trends, /\.\.\.growthParams, \.\.\.growthParams/);
assert.match(sources, /!keyword\.trim\(\)/);
assert.match(sources, /period !== "all"/);
assert.match(sources, /SELECT DISTINCT/);
assert.match(sources, /finally \{/);
assert.match(sources, /connection\.end\(\)/);
assert.match(history, /allowedPeriods = new Set\(\["24h", "7d", "30d", "custom"\]\)/);
assert.match(history, /Érvénytelen dátumtartomány/);
assert.match(history, /finally \{/);
assert.match(history, /DB close error/);
assert.match(trends, /DB close error/);
assert.match(trends, /trends_query_failed/);
assert.doesNotMatch(trends, /NextResponse\.json\(\{ error: err\.message \}/);
assert.match(history, /trend_history_failed/);
assert.doesNotMatch(history, /NextResponse\.json\(\{ error: err\.message \}/);
assert.match(read('app/api/fetch-feed/route.ts'), /feed_fetch_failed/);
assert.doesNotMatch(read('app/api/fetch-feed/route.ts'), /\{ error: String\(err\) \}/);
assert.match(related, /related_query_failed/);
assert.match(related, /status: 500/);
assert.match(timeseries, /invalid_period/);
assert.match(timeseries, /\["24h", "7d", "30d", "90d"\]/);

console.log('trends/related API validation regression: PASS');
