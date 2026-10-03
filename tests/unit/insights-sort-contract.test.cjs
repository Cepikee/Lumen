const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('app/api/insights/route.ts', 'utf8');

assert.match(source, /url\.searchParams\.get\("sort"\)/);
assert.match(source, /error: "invalid_sort"/);
assert.match(source, /status: 400/);
assert.match(source, /\["Legfrissebb", "latest"\]/);
assert.match(source, /\["Legtöbb forrás", "sources"\]/);
assert.match(source, /sort === "latest"/);
assert.match(source, /sort === "sources"/);
assert.match(source, /a\.articleCount - b\.articleCount/);
assert.match(source, /String\(a\.category \|\| ""\)\.localeCompare/);

console.log('insights sort contract regression: PASS');
