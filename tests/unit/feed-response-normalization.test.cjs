const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../app/page.tsx'), 'utf8');

assert.match(source, /function normalizeFeedItems\(raw: unknown\): FeedItem\[\]/);
assert.match(source, /Number\.isSafeInteger\(id\) && id > 0/);
assert.match(source, /return normalizeFeedItems\(raw\);/);
assert.doesNotMatch(source, /raw\.map\(\(item: any\) =>/);

console.log('feed response normalization contract: PASS');
