const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../components/WSourceSpeedIndexLeaderboard.tsx'), 'utf8');
assert.match(source, /Number\.isFinite\(Number\(item\.avgDelay\)\)/);
assert.match(source, /Number\.isFinite\(Number\(item\.medianDelay\)\)/);
assert.match(source, /\.toFixed\(1\)/);
console.log('speed index null/number contract regression: PASS');
