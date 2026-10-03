const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const byId = read('app/api/hirado/by-id/route.ts');
const canWatch = read('app/api/hirado/can-watch/route.ts');

// Both endpoints query an integer video primary key.  Keep malformed values
// out of the DB layer instead of relying on MySQL coercion.
assert.match(byId, /INVALID_VIDEO_ID/);
assert.match(byId, /!\/\^\\d\+\$\//);
assert.match(byId, /Number\.isSafeInteger\(Number\(videoId\)\)/);
assert.match(byId, /\[Number\(videoId\)\]/);
assert.match(canWatch, /rawVideoId/);
assert.match(canWatch, /Number\.isSafeInteger\(Number\(rawVideoId\)\)/);
assert.match(canWatch, /INVALID_VIDEO_ID/);

console.log('Híradó video ID validation regression: PASS');
