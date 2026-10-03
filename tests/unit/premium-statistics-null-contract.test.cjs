const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');

const clickbait = read('components/WSourceClickbait.tsx');
const ratio = read('components/WSourceClickbaitRatio.tsx');
const category = read('components/WSentimentByCategory.tsx');
const timeline = read('components/WSentimentTimeline.tsx');
const today = read('components/WSentimentToday.tsx');
const activityApi = read('app/api/insights/source-activity/route.ts');
const clickbaitApi = read('app/api/insights/clickbait/route.ts');
const duplicationApi = read('app/api/insights/duplication/route.ts');

assert.match(clickbait, /Number\.isFinite\(Number\(s\?\.avg_clickbait\)\)/);
assert.match(ratio, /Number\.isFinite\(Number\(s\?\.ratio\)\)/);
assert.match(category, /data\.categories\[c\]\?\.negative/);
assert.match(timeline, /Number\(t\?\.positive\)/);
assert.match(timeline, /Number\(t\?\.negative\)/);
assert.match(today, /const asCount = \(value: unknown\)/);
assert.match(activityApi, /TRIM\(source\) <> ''/);
assert.match(clickbaitApi, /ORDER BY bucket ASC/);
assert.match(clickbaitApi, /const sources = sourceRows\.map/);
assert.match(duplicationApi, /COALESCE\(NULLIF\(LOWER\(TRIM\(c\.first_source\)\)/);

console.log('premium statistics null/date contract regression: PASS');
