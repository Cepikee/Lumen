const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');

const verify = read('app/verify-email/page.tsx');
assert.match(verify, /res\.ok && data\?\.success === true/);
assert.match(verify, /catch \{/);

for (const file of ['components/AvatarModal.tsx', 'components/FrameModal.tsx']) {
  const source = read(file);
  assert.match(source, /res\.ok && data\?\.success === true/);
  assert.match(source, /res\.json\(\)\.catch\(\(\) => null\)/);
}

const spike = read('components/SpikeModal.tsx');
assert.match(spike, /new AbortController\(\)/);
assert.match(spike, /signal: controller\.signal/);
assert.match(spike, /controller\.abort\(\)/);
assert.match(spike, /Number\.isFinite\(number\)/);
assert.match(spike, /data\.stats || typeof data\.stats !== "object"/);

console.log('remaining fetch/error and spike race contracts regression: PASS');
