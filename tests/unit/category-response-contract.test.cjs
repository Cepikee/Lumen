const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../app/insights/category/[category]/page.tsx'),
  'utf8'
);

assert.match(
  source,
  /const rawItems = Array\.isArray\(json\.items\) \? json\.items : \[\];/,
  'category page must treat malformed items payloads as an empty list'
);
assert.match(
  source,
  /const normalizedRingSources = \(Array\.isArray\(json\.ringSources\) \? json\.ringSources : \[\]\)/,
  'category page must normalize ringSources payloads before rendering'
);
assert.match(
  source,
  /\.filter\(\(source: any\) => source && typeof source === "object"\)/,
  'category page must discard null ringSources rows'
);

console.log('category response contract regression: PASS');
