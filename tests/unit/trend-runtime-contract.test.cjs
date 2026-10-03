const fs = require('fs');
const assert = require('assert');

const list = fs.readFileSync('components/TrendsList.tsx', 'utf8');
const panel = fs.readFileSync('components/TrendsPanel.tsx', 'utf8');

// Prop changes must not briefly install an unvalidated runtime payload.
assert.match(list, /setTrends\(externalTrends\.map\(normalizeTrend\)\.filter/);

// mysql2 and JSON APIs can expose aggregate values as numeric strings; the
// panel must preserve those frequencies instead of silently displaying 0.
assert.match(panel, /const rawFrequency = r\.freq \?\? r\.totalCount \?\? r\.frequency/);
assert.match(panel, /Number\.isFinite\(numericFrequency\)/);

console.log('trend runtime contract tests passed');
