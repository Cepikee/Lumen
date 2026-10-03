const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../components/HiradoPlayer.tsx'), 'utf8');

assert.match(source, /const entitlementChecked = useRef\(false\)/);
assert.match(source, /const entitlementRequest = useRef<Promise<void> \| null>\(null\)/);
assert.match(source, /if \(blocked \|\| entitlementChecked\.current \|\| entitlementRequest\.current\) return/);
assert.match(source, /if \(!res\.ok\) return/);
assert.match(source, /typeof data\.canWatch !== "boolean"/);
assert.match(source, /entitlementChecked\.current = data\.canWatch/);

console.log('hirado player entitlement race regression: PASS');
