const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('app/api/insights/route.ts', 'utf8');
assert.match(source, /start\.setUTCDate\(start\.getUTCDate\(\) - \(days - 1\)\)/);
assert.doesNotMatch(source, /start\.setDate\(start\.getDate\(\) - \(days - 1\)\)/);
console.log('insights period host-timezone regression: PASS');
