"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("localhost layout nem tölt külső captcha vagy analitika scriptet explicit bekapcsolás nélkül", () => {
  const source = read("app/layout.tsx");
  assert.match(source, /recaptchaSiteKey \?/);
  assert.match(source, /analyticsEnabled \?/);
  assert.match(source, /NEXT_PUBLIC_ANALYTICS_ENABLED/);
});

test("local demo captcha csak nem-production loopback utom_dev konfigurációban ad magas pontszámot", () => {
  const source = read("lib/recaptcha.ts");
  assert.match(source, /NODE_ENV !== "production"/);
  assert.match(source, /UTOM_LOCAL_DEMO_CAPTCHA === "true"/);
  assert.match(source, /DB_NAME === "utom_dev"/);
  assert.match(source, /token === "local-demo"/);
});

test("a kliens login és reset flow közös captcha adaptert használ", () => {
  const source = read("components/LoginModal.tsx");
  assert.match(source, /getRecaptchaToken\("login"\)/);
  assert.match(source, /getRecaptchaToken\("forgot_password"\)/);
  assert.match(source, /getRecaptchaToken\("forgot_pin"\)/);
});

test("a localhost feed és related API a konfigurált MySQL portot használja", () => {
  const summaries = read("app/api/summaries/route.ts");
  const related = read("app/api/related/route.ts");
  assert.match(summaries, /port: Number\(process\.env\.DB_PORT \|\| 3306\)/);
  assert.match(related, /port: Number\(process\.env\.DB_PORT \|\| 3306\)/);
});

test("local demo session cookie HTTP-n is használható, productionben Secure marad", () => {
  const source = read("lib/auth-session.ts");
  assert.match(source, /function isLocalDemoRuntime\(\)/);
  assert.match(source, /UTOM_LOCAL_DEMO_CAPTCHA === "true"/);
  assert.match(source, /DB_NAME === "utom_dev"/);
  assert.match(source, /return process\.env\.NODE_ENV === "production" && !isLocalDemoRuntime\(\)/);
  assert.match(source, /secure: shouldUseSecureCookie\(\)/);
});
