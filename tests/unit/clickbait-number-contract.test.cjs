const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['WSourceClickbait.tsx', 'WSourceClickbaitRatio.tsx']) {
  const source = fs.readFileSync(path.join(__dirname, '../../components', file), 'utf8');
  assert.match(source, /Number\.isFinite\(Number\(s\?\.avg_clickbait\)|Number\.isFinite\(Number\(s\?\.ratio\)/);
  assert.match(source, /Ismeretlen forrás/);
}
console.log('clickbait numeric/null contract regression: PASS');
