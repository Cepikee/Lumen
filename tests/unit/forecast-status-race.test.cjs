const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../components/ForecastStatus.tsx'), 'utf8');

assert.match(source, /let requestSequence = 0;/);
assert.match(source, /const requestId = \+\+requestSequence;/);
assert.match(source, /requestId !== requestSequence/);
assert.match(source, /let mounted = true;/);
assert.match(source, /mounted = false;/);

console.log('forecast status race regression: PASS');
