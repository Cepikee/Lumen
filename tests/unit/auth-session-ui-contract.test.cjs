const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const hook = read('hooks/useUser.ts');
const header = read('components/Header.tsx');
const password = read('app/reset-password/ResetPasswordInner.tsx');
const pin = read('app/reset-pin/page.tsx');
const settings = read('components/SettingsView.tsx');
const username = read('components/UsernameChangeModal.tsx');
const register = read('components/RegisterModal.tsx');
const passwordModal = read('components/PasswordChangeModal.tsx');

// A transient auth 5xx must not be interpreted as a logout in the standalone hook.
assert.match(hook, /if \(!res\.ok\)/);
assert.match(hook, /res\.status === 401/);
assert.match(hook, /data\.loggedIn === true && data\.user/);
// Both 401 and transient auth failures must terminate the loading state.
assert.match(hook, /if \(!res\.ok\)[\s\S]*setLoading\(false\);[\s\S]*return;/);

// Header must use the shared auth store loader; a second auth probe would
// duplicate the request and could race the canonical store state.
assert.match(header, /useUserStore\.getState\(\)\.loadUser/);
assert.doesNotMatch(header, /fetch\(["']\/api\/auth\/me/);

// Reset flows must handle HTTP errors and non-JSON bodies without throwing in submit.
for (const source of [password, pin]) {
  assert.match(source, /const text = await res\.text\(\)/);
  assert.match(source, /!res\.ok \|\| data\.success !== true/);
  assert.match(source, /catch \{/);
  assert.match(source, /if \(!token\)/);
  assert.match(source, /disabled=\{status === "loading" \|\| !token\}/);
}

// Settings must render its auth-loading state safely before a user exists.
assert.match(settings, /useState\(user\?\.nickname \?\? ""\)/);
assert.doesNotMatch(settings, /useState\(user!\.nickname\)/);

// Username updates must treat non-2xx and malformed responses as failures.
assert.match(username, /res\.ok && data\?\.success === true/);
assert.match(username, /res\.json\(\)\.catch\(\(\) => null\)/);
assert.match(username, /Number\.isFinite\(parsedLastChange\.getTime\(\)\)/);
// Successful registration creates a cookie server-side; reload is required so
// the already-mounted auth store observes the new session immediately.
assert.match(register, /res\.ok && data\?\.success === true[\s\S]*window\.location\.reload\(\)/);
// Revoking every session also revokes the current cookie; the UI must refresh
// instead of continuing to render the stale authenticated store.
assert.match(passwordModal, /if \(logoutEverywhere\) window\.location\.reload\(\)/);
// Client-side username validation must accept the same separators as the API.
assert.match(username, /!\/\^\[a-zA-Z0-9\._-\]\+\$\/.test\(newUsername\)/);

console.log('auth session UI contract regression: PASS');
