const assert = require('node:assert/strict');
const fs = require('node:fs');

const contact = fs.readFileSync('app/kapcsolat/page.tsx', 'utf8');
assert.match(contact, /res\.ok && data\?\.success === true/);
assert.match(contact, /res\.json\(\)\.catch\(\(\) => null\)/);

const clear = fs.readFileSync('components/ClearButton.tsx', 'utf8');
assert.match(clear, /!res\.ok/);
assert.match(clear, /A törlési művelet jelenleg nem érhető el/);
console.log('contact and disabled-maintenance UI response regression: PASS');
