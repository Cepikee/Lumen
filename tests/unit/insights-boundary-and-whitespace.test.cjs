const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '../../', p), 'utf8');

const timeline = read('app/api/insights/sentiment/timeline/route.ts');
assert.match(timeline, /published_at >= \? AND published_at < \?/,
  'sentiment timeline must use an exclusive end boundary');
assert.doesNotMatch(timeline, /published_at >= \? AND published_at <= \?/);

for (const file of [
  'app/api/insights/heatmap/route.ts',
  'app/api/insights/sentiment/by-category/route.ts',
  'app/api/insights/clickbait/route.ts',
]) {
  const source = read(file);
  assert.match(source, /TRIM\(category\) <> ''/,
    `${file} must retain non-empty whitespace-normalized categories`);
}

console.log('insights date-boundary and whitespace regressions: PASS');
