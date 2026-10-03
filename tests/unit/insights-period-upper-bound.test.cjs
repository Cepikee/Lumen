const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../app/api/insights/route.ts'),
  'utf8'
);

// A trailing-period query must exclude rows timestamped in the future. Without
// the exclusive upper bound, clock-skewed or scheduled rows pollute every
// current insights card and its sparkline.
assert.match(source, /created_at >= \? AND created_at < \?/);
assert.match(source, /params\.push\(startStr, endStr\)/);

console.log('insights period upper-bound regression: PASS');
