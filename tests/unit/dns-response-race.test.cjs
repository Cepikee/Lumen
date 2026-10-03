const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '../../components', name), 'utf8');
const root = read('UtomDns.tsx');
const category = read('UtomDnsKategoria.tsx');
const overview = read('UtomDnsOsszkep.tsx');

assert.match(root, /if \(!r\.ok\) throw new Error\(`dns_http_\$\{r\.status\}`\)/);
assert.match(category, /if \(!r\.ok\) throw new Error\(`dns_category_http_\$\{r\.status\}`\)/);
assert.match(overview, /if \(!r\.ok\) throw new Error\(`dns_overview_http_\$\{r\.status\}`\)/);
assert.match(overview, /let mounted = true;/);
assert.match(overview, /if \(mounted && json\?\.success\)/);
assert.match(overview, /mounted = false;/);

console.log('DNS response/race regression: PASS');
