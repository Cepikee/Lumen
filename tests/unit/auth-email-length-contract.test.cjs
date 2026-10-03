const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../app/api/auth', file), 'utf8');

assert.match(read('register/route.ts'), /email\.length > 254/);
assert.match(read('request-password-reset/route.ts'), /!email \|\| email\.length > 254/);
assert.match(read('request-pin-reset/route.ts'), /!email \|\| email\.length > 254/);

console.log('auth email length validation regression: PASS');
