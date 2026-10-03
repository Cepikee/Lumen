const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'HiradoClient.tsx'),
  'utf8'
);

// A slow response for a previous archive video must not replace the current video.
assert.match(source, /useEffect\(\(\) => \{\s*let cancelled = false;\s*async function load\(\)/);
assert.match(source, /if \(cancelled\) return;\s*setData\(json\);/);
assert.match(source, /return \(\) => \{\s*cancelled = true;\s*\};\s*\}, \[videoId\]\);/);

// The shared auth request also must not update state after unmount.
assert.match(source, /if \(cancelled\) return;\s*setUser\(json\.user \?\? null\);/);

console.log('hirado client fetch race regression: PASS');
