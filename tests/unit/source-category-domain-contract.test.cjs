const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/insights/source-category-distribution/route.ts', 'utf8');

// The API emits the legacy Portfolio source as portfolio.hu. The request
// filter must use the same identity, otherwise the filtered chart is empty
// while the unfiltered chart contains the source.
assert.match(route, /const rawDomain = searchParams\.get\("domain"\)\?\.trim\(\)\.toLowerCase\(\);/);
// Source aliases are canonicalized before filtering; keep the legacy
// portfolio fallback for backwards-compatible data rows.
assert.match(route, /normalizeSourceIdentity\(rawDomain\)\?\.key/);
assert.match(route, /rawDomain === "portfolio" \? "portfolio\.hu" : rawDomain/);
assert.match(route, /items\.filter\(\(i: any\) => i\.source === domain\)/);

console.log('source-category domain contract tests passed');
