const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const premium = read('app/premium/page.tsx');
const faq = read('app/premium-faq/page.tsx');

// Payment is intentionally unavailable without a provider integration. The UI
// must not imply that checkout is live or leave a misleading input enabled.
assert.equal((premium.match(/disabled aria-disabled="true"/g) || []).length, 5);
assert.match(premium, /Az előfizetés és a próbaidő jelenleg nem érhető el/);
assert.match(premium, /className="supporter-input"[\s\S]*disabled/);
assert.match(faq, /fizetési szolgáltatása jelenleg nem érhető el/);
assert.doesNotMatch(faq, /jelenleg <strong>Barion<\/strong> fizetéssel érhető el/);

console.log('premium availability contract regression: PASS');
