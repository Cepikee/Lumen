const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../app/api/insights/spike-detection/route.ts'), 'utf8');

assert.match(source, /businessDayBounds/);
assert.match(source, /mysqlUtc\(bounds\.start\)/);
assert.match(source, /created_at < \?/);
assert.match(source, /timeZone: "Europe\/Budapest"/);
assert.match(source, /function localBusinessHour/);

console.log('spike detection timezone regression: PASS');
