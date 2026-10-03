const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('components/HiradoPlayer.tsx', 'utf8');

assert.match(source, /const entitlementAbort = useRef<AbortController \| null>\(null\);/);
assert.match(source, /entitlementAbort\.current\?\.abort\(\);/);
assert.match(source, /signal: controller\.signal/);
assert.match(source, /entitlementRequest\.current = null;/);

console.log('hirado player entitlement race regression: PASS');
