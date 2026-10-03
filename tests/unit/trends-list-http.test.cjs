const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../components/TrendsList.tsx'), 'utf8');

assert.match(source, /trends_http_\$\{res\.status\}/);
assert.match(source, /trend_history_http_\$\{res\.status\}/);
assert.match(source, /trends_invalid_response/);
assert.match(source, /trend_history_invalid_response/);

console.log('trends list HTTP handling regression: PASS');
