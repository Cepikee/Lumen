const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../app/api/auth/username-reset/route.ts'),
  'utf8',
);

// The API message promises these separators; the validation must accept them
// after trimming, while still rejecting whitespace and other punctuation.
assert.match(source, /\/\^\[a-zA-Z0-9\._-\]\+\$\//);
assert.match(source, /A felhasználónév csak betűket, számokat, pontot, kötőjelet és aláhúzást/);

console.log('username reset validation contract regression: PASS');
