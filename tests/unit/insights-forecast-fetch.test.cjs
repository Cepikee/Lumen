const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '../../app/insights/page.tsx'), 'utf8');
const hook = fs.readFileSync(path.join(__dirname, '../../hooks/useForecast.ts'), 'utf8');

assert.match(page, /import \{ useForecast \} from ["']@\/hooks\/useForecast["'];/);
assert.doesNotMatch(page, /const useForecast\s*=\s*\(\)\s*=>\s*useSWR/);
assert.match(hook, /if \(!r\.ok\) throw new Error\(`forecast_http_\$\{r\.status\}`\)/);
assert.match(hook, /if \(!data \|\| typeof data !== "object"\) throw new Error\("forecast_invalid_response"\)/);

console.log('insights forecast HTTP contract regression: PASS');
