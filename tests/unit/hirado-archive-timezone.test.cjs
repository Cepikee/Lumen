const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('components/HiradoArchive.tsx', 'utf8');
assert.match(source, /toLocaleDateString\("hu-HU", \{\s*timeZone: "Europe\/Budapest"/);
console.log('hirado archive timezone regression: PASS');
