const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const update = read('app/api/user/update/route.ts');
const password = read('app/api/user/change-password/route.ts');
const pin = read('app/api/user/change-pin/route.ts');
const avatar = read('app/api/user/avatar/route.ts');
const frame = read('app/api/user/frame/route.ts');
const settings = read('components/SettingsView.tsx');
const theme = read('components/ThemeSwitch.tsx');

// Profile save must not bypass the dedicated username cooldown/uniqueness flow.
assert.match(update, /const allowedFields = \["theme", "bio"\]/);
assert.match(update, /updates\.theme !== undefined && !\["light", "dark", "system"\]/);
assert.doesNotMatch(settings, /JSON\.stringify\(\{ nickname, bio \}\)/);
assert.match(update, /status: 401/);
assert.match(update, /Érvénytelen kérés/);
assert.match(password, /logoutEverywhere !== undefined && typeof logoutEverywhere !== "boolean"/);

// Mutation routes must map malformed JSON to a client error rather than 500.
for (const source of [password, pin, avatar, frame]) {
  assert.match(source, /req\.json\(\)/);
  assert.match(source, /status: 400/);
}

// Avatar input is bounded and restricted to the styles the UI can render.
assert.match(avatar, /allowedStyles/);
assert.match(avatar, /seed\.length > 128/);
assert.match(avatar, /format !== "svg"/);

// Theme click handlers consume rejected fetches and restore the last value.
assert.match(theme, /try \{/);
assert.match(theme, /catch \(error\)/);
assert.match(theme, /const previousTheme = useUserStore\.getState\(\)\.theme/);
assert.match(theme, /setTheme\(previousTheme\)/);

console.log('user mutation contract regression: PASS');
