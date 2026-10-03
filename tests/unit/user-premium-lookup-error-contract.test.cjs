const assert = require('node:assert/strict');
const fs = require('node:fs');

for (const file of [
  'app/api/user/avatar/route.ts',
  'app/api/user/frame/route.ts',
]) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /getSessionUserId\(\)/, `${file} must resolve the session`);
  assert.match(source, /session lookup error/i, `${file} must map session lookup failures`);
  assert.match(source, /getPremiumEntitlement\(userId\)/, `${file} must resolve entitlement`);
  assert.match(source, /entitlement lookup error/i, `${file} must map entitlement lookup failures`);
  assert.match(source, /status: 500/, `${file} must return JSON 500 on lookup failures`);
}

console.log('user premium lookup error response regression: PASS');
