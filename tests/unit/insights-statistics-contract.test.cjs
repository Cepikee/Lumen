const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const timeseries = read('app/api/insights/timeseries/route.ts');
const clickbait = read('app/api/insights/clickbait/route.ts');
const duplication = read('app/api/insights/duplication/route.ts');
const heatmap = read('app/api/insights/heatmap/route.ts');
const stats = read('app/api/trends/stats/route.ts');

assert.match(timeseries, /invalid_period/);
assert.match(timeseries, /new Set\(\["7d", "30d", "90d"\]\)/);
assert.match(clickbait, /MIN\(TRIM\(category\)\) AS category/);
assert.match(clickbait, /GROUP BY LOWER\(TRIM\(category\)\)/);
assert.match(duplication, /COALESCE\(NULLIF\(LOWER\(TRIM\(a\.source\)\)/);
assert.match(duplication, /String\(r\.source \?\? "ismeretlen"\)/);
assert.match(heatmap, /GROUP BY LOWER\(TRIM\(category\)\), bucket/);
assert.match(heatmap, /categories\.find/);
assert.match(stats, /searchParams\.get\("keyword"\)\?\.trim\(\)/);
assert.match(stats, /finally/);
assert.match(stats, /await connection\.end\(\)/);

console.log('insights/statistics validation regression: PASS');
