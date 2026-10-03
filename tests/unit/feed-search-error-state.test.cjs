const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../app/page.tsx'), 'utf8');

// A failed search/feed request must not be interpreted as an empty page. That
// would show "no more stories" and make the user think the query had no hits.
assert.match(source, /Promise<FeedItem\[\] \| null>/);
assert.match(source, /if \(firstPage === null\) return;/);
assert.match(source, /if \(data === null\) return;/);
assert.match(source, /if \(newItems === null\) return;/);

// An older request must not reintroduce its error after a newer query starts.
assert.match(source, /requestId === undefined \|\| requestId === feedRequestRef\.current/);
assert.match(source, /setError\(null\);\s*setItems\(\[\]\);/s);

console.log('feed search error-state regression: PASS');
