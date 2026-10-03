const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../components', file), 'utf8');
const filters = read('TrendsFilters.tsx');
const debug = read('TrendsDebug.tsx');
const theme = read('ThemeSwitch.tsx');

assert.equal((filters.match(/<TrendsDebug filters=\{filters\} \/>/g) || []).length, 1);
assert.match(debug, /const requestSequence = useRef\(0\)/);
assert.match(debug, /requestId !== requestSequence\.current/);
assert.match(debug, /trends_debug_http_\$\{res\.status\}/);
assert.match(theme, /const abortRef = useRef<AbortController \| null>\(null\)/);
assert.match(theme, /abortRef\.current\?\.abort\(\)/);
assert.match(theme, /signal: controller\.signal/);

console.log('trends debug/theme race regression: PASS');
