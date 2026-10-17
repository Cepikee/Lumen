const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('cost-bearing analyze endpoint requires internal worker authorization', () => {
  const source = read('app/api/analyze/route.ts');
  assert.match(source, /requireInternalWorker/);
  assert.match(source, /const denied = requireInternalWorker\(req\)/);
  assert.ok(source.indexOf('requireInternalWorker(req)') < source.indexOf('await fetchExternalArticle('));
});

test('registration and verification emails are origin, captcha and rate-limit protected', () => {
  const register = read('app/api/auth/register/route.ts');
  const verify = read('app/api/auth/send-verification/route.ts');
  const client = read('components/RegisterModal.tsx');
  assert.match(register, /requireTrustedOrigin\(req\)/);
  assert.match(register, /verifyRecaptcha\(recaptchaToken, \{ expectedAction: "register" \}\)/);
  assert.match(register, /scope: "register-ip"/);
  assert.match(register, /scope: "register-email"/);
  assert.match(client, /getRecaptchaToken\("register"\)/);
  assert.match(verify, /scope: "email-verification-user"/);
  assert.match(verify, /scope: "email-verification-ip"/);
});

test('free video entitlement consumption is POST-only and uses shared security helpers', () => {
  const route = read('app/api/hirado/can-watch/route.ts');
  const player = read('components/HiradoPlayer.tsx');
  assert.doesNotMatch(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /requireTrustedOrigin\(req\)/);
  assert.match(route, /getIp\(req\)/);
  assert.match(route, /consumeRateLimitFailClosed/);
  assert.match(player, /method: "POST"/);
  assert.match(player, /JSON\.stringify\(\{ videoId: video\.id \}\)/);
});

test('video server validates premium expiry, exact origins, token timing and byte ranges', () => {
  const source = read('video-server.js');
  assert.match(source, /evaluatePremium\(user\)\.active/);
  assert.match(source, /premium_until/);
  assert.match(source, /new URL\(candidate\)\.origin/);
  assert.doesNotMatch(source, /source\.startsWith\(base\)/);
  assert.doesNotMatch(source, /Incoming token params/);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /res\.writeHead\(416/);
  assert.match(source, /VIDEO_SERVER_HOST \|\| "127\.0\.0\.1"/);
});

test('analytics never sends reset or verification query tokens', () => {
  const analytics = read('components/Analytics.tsx');
  const layout = read('app/layout.tsx');
  assert.match(analytics, /reset-password/);
  assert.match(analytics, /reset-pin/);
  assert.match(analytics, /verify-email/);
  assert.match(analytics, /page_location: `\$\{window\.location\.origin\}\$\{pathname\}`/);
  assert.doesNotMatch(layout, /googletagmanager\.com/);
  assert.doesNotMatch(layout, /gtag\('config'/);
});

test('global web hardening does not allow wildcard Server Action origins', () => {
  const config = read('next.config.ts');
  assert.doesNotMatch(config, /allowedOrigins\s*:\s*\[\s*["']\*["']/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /frame-ancestors 'self'/);
});

test('login response no longer enumerates nonexistent accounts', () => {
  const login = read('app/api/auth/login/route.ts');
  assert.doesNotMatch(login, /Nincs ilyen felhasználó/);
  assert.match(login, /Hibás bejelentkezési adatok/);
});

test('contact form uses canonical IP/rate limit and HTML-escapes custom subject', () => {
  const contact = read('app/api/contact/route.ts');
  assert.match(contact, /getIp\(req\)/);
  assert.match(contact, /scope: "contact-ip"/);
  assert.match(contact, /scope: "contact-email"/);
  assert.match(contact, /const safeSubject = escapeHtml\(finalSubject\)/);
  assert.doesNotMatch(contact, /req\.headers\.get\("x-forwarded-for"\)/);
});
