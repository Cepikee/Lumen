const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../app/api/auth', file), 'utf8');
const resetPassword = read('reset-password/route.ts');
const resetPin = read('reset-pin/route.ts');
const verifyEmail = read('verify-email/route.ts');
const avatar = read('avatar/route.ts');
const username = read('username-reset/route.ts');
const sendVerification = read('send-verification/route.ts');
const register = read('register/route.ts');
const requestPassword = read('request-password-reset/route.ts');
const requestPin = read('request-pin-reset/route.ts');
const me = read('me/route.ts');

assert.match(resetPassword, /Érvénytelen JSON/);
assert.match(resetPin, /Érvénytelen JSON/);
assert.match(verifyEmail, /Érvénytelen JSON/);
assert.match(avatar, /Invalid JSON/);
assert.match(resetPassword, /updateResult\?\.affectedRows !== 1/);
assert.match(resetPin, /updateResult\?\.affectedRows !== 1/);
assert.match(verifyEmail, /Hiányzó token.*status: 400/s);
assert.match(avatar, /Not logged in.*status: 401/s);
assert.match(username, /message: "Nem vagy bejelentkezve\."[\s\S]{0,80}status: 401/);
assert.match(username, /ER_DUP_ENTRY/);
assert.match(username, /\["admin", "moderator", "support", "utom", "system"\]/);
assert.match(sendVerification, /User nem található.*status: 404/s);
assert.match(me, /auth_state_unavailable.*status: 500/s);
for (const source of [register, requestPassword, requestPin]) {
  assert.match(source, /Érvénytelen JSON kérés/);
  assert.match(source, /Array\.isArray\(body\)/);
}

console.log('auth response contract regression: PASS');
