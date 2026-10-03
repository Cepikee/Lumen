const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const route = fs.readFileSync(path.join(__dirname, '../../app/api/sources/route.ts'), 'utf8');
const summaries = fs.readFileSync(path.join(__dirname, '../../app/api/summaries/route.ts'), 'utf8');
const layout = fs.readFileSync(path.join(__dirname, '../../components/ClientLayout.tsx'), 'utf8');
const distribution = fs.readFileSync(path.join(__dirname, '../../components/WSourceCategoryDistribution.tsx'), 'utf8');
const distributionRoute = fs.readFileSync(path.join(__dirname, '../../app/api/insights/source-category-distribution/route.ts'), 'utf8');
const sourceActivity = fs.readFileSync(path.join(__dirname, '../../components/WhatHappenedTodaySourceActivity.tsx'), 'utf8');

assert.match(route, /JOIN articles a ON a\.source_id = s\.id/);
assert.match(route, /JOIN summaries su ON su\.article_id = a\.id/);
assert.match(route, /WHERE s\.is_active = 1/);
assert.doesNotMatch(layout, /fetch\("\/api\/sources"[\s\S]{0,220}x-api-key/);
assert.match(summaries, /if \(\/\^\\d\+\$\/\.test\(raw\)\)/);
assert.match(summaries, /const id = Number\(raw\)/);
assert.match(summaries, /function sourceIdFromFilter\(rawValue: string\)/);
assert.match(summaries, /const raw = rawValue\.trim\(\)/);
assert.match(summaries, /"24": 2/);
assert.match(summaries, /"444hu": 6/);
assert.match(summaries, /return sourceIdFromFilter\(/);
assert.match(summaries, /whereParts\.push\("src\.is_active = 1"\)/);
assert.match(summaries, /const escaped = q\.replace/);
assert.match(summaries, /LIKE \? ESCAPE/);
assert.match(distribution, /if \(!r\.ok\) throw new Error\(`source_category_http_\$\{r\.status\}`\)/);
assert.match(distributionRoute, /GROUP BY LOWER\(TRIM\(source\)\), LOWER\(TRIM\(category\)\)/);
assert.match(distributionRoute, /function canonicalCategory/);
assert.match(distributionRoute, /toLocaleLowerCase\("hu-HU"\)/);
assert.match(sourceActivity, /filter\(\(s\): s is SourceItem => !!s && typeof s === "object"\)/);
assert.match(sourceActivity, /Number\.isFinite\(Number\(s\.total\)\)/);
assert.match(sourceActivity, /sort\(\(a, b\) => b\.total - a\.total \|\| a\.source\.localeCompare\(b\.source\)\)/);

console.log('source flow contract regression: PASS');
