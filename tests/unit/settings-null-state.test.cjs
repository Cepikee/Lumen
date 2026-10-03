const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../components/SettingsView.tsx'), 'utf8');

// Settings renders once while the auth probe is pending. Optional user fields
// must not be dereferenced before the authenticated user arrives.
assert.match(source, /useState\(user\?\.bio \?\? ""\)/);
assert.doesNotMatch(source, /useState\(user!\.bio/);
assert.match(source, /setBio\(user\?\.bio \?\? ""\)/);

console.log('settings null-state regression: PASS');
