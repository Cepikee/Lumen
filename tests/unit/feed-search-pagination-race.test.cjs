const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../app/page.tsx'), 'utf8');

// Changing the search/filter while a later page is visible must invalidate
// the pagination effect from that render. Otherwise page N can append to the
// freshly reset page-1 result set.
assert.match(source, /const resetFeedKeyRef = useRef<string \| null>\(null\);/);
assert.match(source, /resetFeedKeyRef\.current = feedQueryKey;/);
assert.match(
  source,
  /if \(resetFeedKeyRef\.current === feedQueryKey\) return;/g
);
assert.match(source, /resetFeedKeyRef\.current = null;/);

console.log('feed search pagination race regression: PASS');
