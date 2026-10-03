const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const insights = fs.readFileSync(path.join(__dirname, '../../hooks/useInsights.ts'), 'utf8');
const timeseries = fs.readFileSync(path.join(__dirname, '../../hooks/useTimeseriesAll.ts'), 'utf8');

assert.match(insights, /normalizeInsightsResponse\(value: unknown\)/);
assert.match(insights, /categories: Array\.isArray\(raw\.categories\) \? raw\.categories : \[\]/);
assert.match(insights, /items: Array\.isArray\(raw\.items\) \? raw\.items : \[\]/);
assert.match(insights, /r\.json\(\)\.then\(normalizeInsightsResponse\)/);
assert.match(timeseries, /normalizeTimeseriesResponse\(value: unknown\)/);
assert.match(timeseries, /categories: Array\.isArray\(raw\.categories\) \? raw\.categories : \[\]/);
assert.match(timeseries, /r\.json\(\)\.then\(normalizeTimeseriesResponse\)/);

console.log('insights hook response contract: PASS');
