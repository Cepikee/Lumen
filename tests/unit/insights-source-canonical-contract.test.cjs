const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/insights/route.ts', 'utf8');

// Source diversity and ring counts must not split one source into multiple
// entries solely because old rows differ in case or surrounding whitespace.
assert.match(route, /String\(r\.dominantSource\)\.trim\(\)\.toLocaleLowerCase\("hu-HU"\)/);
assert.match(route, /\|\| "ismeretlen"/);

console.log('insights source canonical contract tests passed');
