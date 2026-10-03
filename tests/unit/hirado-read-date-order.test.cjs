const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/hirado/read/[date]/route.ts', 'utf8');

// Multiple reports can exist for one calendar date. The date lookup must pick
// the newest report deterministically, just like the video-id lookup.
assert.match(
  source,
  /DATE\(report_date\) = \? ORDER BY report_date DESC, id DESC LIMIT 1/,
);

console.log('hirado date report ordering regression: PASS');
