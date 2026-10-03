const fs = require('fs');
const assert = require('assert');

const history = fs.readFileSync('app/api/trend-history/route.ts', 'utf8');
const sources = fs.readFileSync('app/api/trends/trend-sources/route.ts', 'utf8');

// mysql2 commonly returns COUNT/HOUR expressions as strings. The 24h
// response must still populate numeric buckets instead of returning 24 zeros.
assert.match(history, /rows\.find\(r\s*=>\s*Number\(r\.hour\)\s*===\s*i\)/);
assert.match(history, /Number\.isFinite\(Number\(found\?\.freq\)\)/);

// Multiple summaries can exist for an article. The source endpoint must pick
// the latest one so one keyword article cannot be duplicated by old summaries.
assert.match(sources, /LEFT JOIN summaries SUMM[\s\S]*?NOT EXISTS/);
assert.match(sources, /newer_summ\.id\s*>\s*SUMM\.id/);

console.log('trend history/source driver contract tests passed');
