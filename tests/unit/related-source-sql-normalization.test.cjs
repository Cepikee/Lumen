const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/related/route.ts', 'utf8');
assert.ok(route.includes('const sourceSqlKey = source.replace(/[.\\s]/g, "");'));
assert.ok(route.includes('[excludeId, sourceSqlKey, limit]'));
console.log('related source SQL normalization regression: PASS');
