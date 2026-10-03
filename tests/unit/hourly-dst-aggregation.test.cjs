const fs = require('fs');
const assert = require('assert');

const heatmap = fs.readFileSync('app/api/insights/heatmap/route.ts', 'utf8');
const sourceActivity = fs.readFileSync('app/api/insights/source-activity/route.ts', 'utf8');

assert.match(heatmap, /matrix\[target\]\[hour\] \+= count;/);
assert.match(sourceActivity, /hourMap\[src\]\[hour\] \+= count;/);

console.log('hourly DST aggregation regression: PASS');
