const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const dns = read('app/api/insights/UtomDnsOsszkep/route.ts');

// Source statistics must reject whitespace-only domains and match the stored
// source semantics case-insensitively after trimming.
assert.match(dns, /searchParams\.get\("domain"\)\?\.trim\(\)\.toLowerCase\(\)/);
assert.match(dns, /if \(!domain\)/);
assert.match(dns, /LOWER\(TRIM\(source\)\) = \?/);

console.log('API numeric/domain input validation regression: PASS');
