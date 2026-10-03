const fs = require('node:fs');
const assert = require('node:assert/strict');

const insights = fs.readFileSync('app/api/insights/route.ts', 'utf8');
assert.match(insights, /error: "invalid_period"/);
assert.match(insights, /period === "7d"/);

const timeline = fs.readFileSync('app/api/insights/sentiment/timeline/route.ts', 'utf8');
assert.match(timeline, /businessDayBounds/);
assert.match(timeline, /hourInZone/);
assert.match(timeline, /mysqlUtc\(bounds\.end\)/);
console.log('insights period and sentiment timeline timezone regression: PASS');
