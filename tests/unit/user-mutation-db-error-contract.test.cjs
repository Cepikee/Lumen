const assert = require('node:assert/strict');
const fs = require('node:fs');

for (const file of [
  'app/api/user/update/route.ts',
  'app/api/user/avatar/route.ts',
  'app/api/user/frame/route.ts',
]) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /catch \(error\)/, `${file} must catch DB failures`);
  assert.match(source, /success: false, message: "Váratlan hiba történt\."/);
  assert.match(source, /status: 500/);
}

console.log('user mutation DB error response regression: PASS');
