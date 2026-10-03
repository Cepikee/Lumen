const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../components/HiradoClient.tsx'), 'utf8');
const archiveSlider = fs.readFileSync(path.join(__dirname, '../../components/HiradoArchiveSlider.tsx'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '../../app/hirado/page.tsx'), 'utf8');

assert.match(source, /if \(!res\.ok\) throw new Error\(`hirado_http_\$\{res\.status\}`\)/);
assert.match(source, /if \(!json\?\.video \|\| typeof json\.video !== "object" \|\| !json\.video\.id\)/);
assert.match(source, /setLoadError\("A híradó adatai nem tölthetők be\."\)/);
assert.match(source, /if \(!res\.ok\) throw new Error\(`auth_http_\$\{res\.status\}`\)/);
assert.match(archiveSlider, /if \(!res\.ok\) throw new Error\(`archive_\$\{res\.status\}`\)/);
assert.match(archiveSlider, /Array\.isArray\(json\?\.videos\)/);
assert.match(archiveSlider, /Number\.isSafeInteger\(id\) && id > 0/);
const archive = fs.readFileSync(path.join(__dirname, '../../components/HiradoArchive.tsx'), 'utf8');
assert.match(archive, /Number\.isSafeInteger\(id\) && id > 0/);
assert.match(page, /WHERE id = \? LIMIT 1/);
assert.match(page, /resolvedSearchParams\?\.video/);

console.log('hirado client response contract regression: PASS');
