const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/contact/route.ts', 'utf8');

// Malformed shapes and parser/provider failures must not be reported as success.
assert.match(source, /JSON\.parse\(bodyText\)/);
assert.match(source, /Érvénytelen JSON/);
assert.match(source, /typeof parsed !== "object" \|\| Array\.isArray\(parsed\)/);
assert.match(source, /error: "Ismeretlen hiba\."[\s\S]*status: 500/);
assert.match(source, /!cfRes\.ok/);
assert.match(source, /status: 502/);
assert.match(source, /typeof turnstileToken !== "string"/);
// Client validation failures must be HTTP errors, otherwise callers may treat
// a rejected contact submission as a successful transport response.
assert.match(source, /error: "Hiányzó mezők\."[\s\S]*status: 400/);
assert.match(source, /error: "Érvénytelen email cím\."[\s\S]*status: 400/);
assert.match(source, /error: "Hiányzó ellenőrző token\."[\s\S]*status: 400/);

console.log('contact malformed input/provider error regression: PASS');
