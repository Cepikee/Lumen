const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('app/api/insights/route.ts', 'utf8');
assert.match(source, /start\.setUTCDate\(start\.getUTCDate\(\) - days\)/);
assert.doesNotMatch(source, /start\.setDate\(start\.getDate\(\) - days\)/);
console.log('insights period host-timezone regression: PASS');
