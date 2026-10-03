const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../hooks/useTimeseries.ts'), 'utf8');
assert.match(source, /normalizeTimeseriesResponse\(value: unknown\)/);
assert.match(source, /points: Array\.isArray\(raw\.points\) \? raw\.points : \[\]/);
assert.match(source, /categories: Array\.isArray\(raw\.categories\) \? raw\.categories : \[\]/);
assert.match(source, /r\.json\(\)\.then\(normalizeTimeseriesResponse\)/);
console.log('timeseries hook response contract: PASS');
