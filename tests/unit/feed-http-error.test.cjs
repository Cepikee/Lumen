const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../app/page.tsx'), 'utf8');

assert.match(source, /summaries_http_\$\{res\.status\}/);
assert.match(source, /today_http_\$\{res\.status\}/);
assert.match(source, /today_invalid_response/);
assert.match(source, /A mai hírek nem tölthetők be/);
assert.match(source, /A szűrt hírek nem tölthetők be/);

console.log('feed HTTP error handling regression: PASS');
