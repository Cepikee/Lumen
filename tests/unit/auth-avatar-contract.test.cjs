const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../app/api/auth/avatar/route.ts'),
  'utf8'
);

// The legacy auth avatar route must enforce the same input and entitlement
// contract as the current user avatar route. Otherwise it is an alternate
// path that can persist arbitrary styles or grant GIF avatars to free users.
assert.match(source, /allowedStyles/);
assert.match(source, /seed\.trim\(\)\.length < 1/);
assert.match(source, /format !== "svg" && format !== "gif"/);
assert.match(source, /getPremiumEntitlement/);
assert.match(source, /format === "gif" && !entitlement\.active/);
assert.match(source, /status: 403/);

console.log('auth avatar contract regression: PASS');
