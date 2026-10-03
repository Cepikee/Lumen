const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../components/RegisterModal.tsx'),
  'utf8',
);

assert.match(source, /try\s*\{[\s\S]*fetch\("\/api\/auth\/register"/);
assert.match(source, /catch\s*\{[\s\S]*setError\("A regisztrációs szolgáltatás jelenleg nem érhető el\."\)/);
assert.match(source, /finally\s*\{\s*setLoading\(false\);\s*\}/);
assert.match(source, /res\.ok\s*&&\s*data\?\.success\s*===\s*true/);

console.log('register modal async error handling regression: PASS');
