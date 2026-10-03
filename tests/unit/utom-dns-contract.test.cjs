const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const route = fs.readFileSync(
  path.join(__dirname, '../../app/api/insights/UtomDnsOsszkep/route.ts'),
  'utf8'
);
const category = fs.readFileSync(
  path.join(__dirname, '../../components/UtomDnsKategoria.tsx'),
  'utf8'
);
const overview = fs.readFileSync(
  path.join(__dirname, '../../components/UtomDnsOsszkep.tsx'),
  'utf8'
);

// The selector endpoint canonicalizes source/category labels. The detail
// endpoint must preserve those selections for historical case/whitespace
// values and the Portfolio alias, otherwise the selected domain shows zeros.
assert.match(route, /if \(domain === "portfolio\.hu"\) domain = "portfolio"/);
assert.match(route, /LOWER\(TRIM\(category\)\) AS category/);
assert.match(route, /GROUP BY LOWER\(TRIM\(category\)\)/);
assert.match(route, /function canonicalCategory/);
assert.match(route, /categories\[category\] \+= Number\(r\.count\) \|\| 0/);
assert.match(category, /new URLSearchParams\(\{ domain \}\)/);
assert.match(overview, /new URLSearchParams\(\{ domain \}\)/);

console.log('Utom DNS source/category contract regression: PASS');
