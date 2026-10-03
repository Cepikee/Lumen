const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/analyze/route.ts', 'utf8');

// A successful AI response must not be reported as success when persisting the
// generated summary fails. The caller needs a stable JSON error contract.
assert.match(source, /analyze: összefoglaló mentési hiba/);
assert.match(source, /error: "summary_persist_failed"/);
assert.match(source, /status: 500/);

console.log('analyze persistence error response regression: PASS');
