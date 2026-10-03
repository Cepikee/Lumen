const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const overview = read('app/api/insights/UtomDnsOsszkep/route.ts');
const spikes = read('app/api/insights/spike-detection/route.ts');
const category = read('app/api/insights/category/[category]/route.ts');

// Global category comparisons must use the same canonical key as the source
// distribution, otherwise case/whitespace variants disappear from the ratio.
assert.match(overview, /LOWER\(TRIM\(category\)\) AS category/);
assert.match(overview, /canonicalCategory\(r\.category\)/);
assert.match(overview, /topEntry\[1\] > 0 \? topEntry\[0\] : null/);

// Spike groups must merge case/whitespace variants and have stable ties.
assert.match(spikes, /GROUP BY LOWER\(TRIM\(category\)\), bucket/);
assert.match(spikes, /GROUP BY LOWER\(TRIM\(source\)\), bucket/);
assert.match(spikes, /a\.type\.localeCompare\(b\.type\)/);

// Reject unsafe pagination values before they can produce an infinite OFFSET,
// and malformed DB timestamps must not turn a valid response into HTTP 500.
assert.match(category, /Number\.isSafeInteger\(requestedPage\)/);
assert.match(category, /Number\.isSafeInteger\(requestedLimit\)/);
assert.match(category, /Number\.isNaN\(date\.getTime\(\)\) \? null/);

console.log('remaining insights API contract regression: PASS');
