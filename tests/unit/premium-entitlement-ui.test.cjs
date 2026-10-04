const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const header = read('components/Header.tsx');
const profile = read('components/ProfileView.tsx');
const settings = read('components/SettingsView.tsx');
const insights = read('app/insights/page.tsx');

assert.match(header, /return u\.isPremium === true/);
assert.match(header, /useUserStore\.getState\(\)\.loadUser/);
assert.doesNotMatch(header, /fetch\(["']\/api\/auth\/me/);
assert.match(profile, /const premiumActive = user\.isPremium === true/);
assert.match(settings, /const premiumActive = user\.isPremium === true/);
assert.match(insights, /const isPremium = user\?\.isPremium === true/);
assert.doesNotMatch(insights, /apiUser\?\.user\?\.is_premium/);
assert.doesNotMatch(insights, /fetch\(["']\/api\/auth\/me/);
assert.doesNotMatch(insights, /apiChecked/);

console.log('premium entitlement UI regression: PASS');
