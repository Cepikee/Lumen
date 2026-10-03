const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const spike = fs.readFileSync(
  path.join(__dirname, '../../components/WhatHappenedTodaySpikeDetection.tsx'),
  'utf8'
);
const heatmap = fs.readFileSync(
  path.join(__dirname, '../../components/WhatHappenedTodayHeatmap.tsx'),
  'utf8'
);

assert.match(spike, /Number\.isFinite\(item\.value\)/);
assert.match(spike, /Number\.isInteger\(item\.hour\)/);
assert.match(heatmap, /Number\.isFinite\(value\)/);
assert.match(heatmap, /value >= 0/);
console.log('insights numeric response contract regression: PASS');
