const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const byId = read('app/api/hirado/by-id/route.ts');
const today = read('app/api/hirado/today/route.ts');

// A DB outage must preserve the JSON error contract consumed by HiradoClient.
assert.match(byId, /HIRADO BY-ID ERROR/);
assert.match(byId, /error: "SERVER_ERROR"/);
assert.match(byId, /status: 500/);

// Multiple uploads for the same Budapest calendar day must select the latest
// row deterministically instead of depending on the storage engine order.
assert.match(today, /WHERE date = \?\s+ORDER BY id DESC\s+LIMIT 1/);

console.log('Híradó read response regression: PASS');
