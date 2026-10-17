"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { validatePassword } = require("../../lib/auth-policy");

const read = (file) => fs.readFileSync(file, "utf8");

test("bcrypt password policy rejects inputs beyond 72 UTF-8 bytes", () => {
  assert.equal(validatePassword("A1" + "x".repeat(70)).valid, true);
  assert.equal(validatePassword("A1" + "x".repeat(71)).valid, false);
  assert.equal(validatePassword("A1" + "é".repeat(36)).valid, false);
});

test("login CAPTCHA runs before account-specific quota and missing users get dummy bcrypt work", () => {
  const source = read("app/api/auth/login/route.ts");
  const captcha = source.indexOf('expectedAction: "login"');
  const account = source.indexOf('scope: "login-account-request"');
  assert.ok(captcha >= 0 && account > captcha);
  assert.match(source, /getDummyPasswordHash/);
  assert.match(source, /bcrypt\.compare\(password, await getDummyPasswordHash\(\)\)/);
});

test("registration email quota is consumed only after valid CAPTCHA", () => {
  const source = read("app/api/auth/register/route.ts");
  const captcha = source.indexOf('expectedAction: "register"');
  const emailGate = source.indexOf('scope: "register-email"');
  assert.ok(captcha >= 0 && emailGate > captcha);
});

test("internal rate-key is accepted only inside authenticated API-key branch", () => {
  const source = read("lib/security.ts");
  const branch = source.indexOf("if (apiKeyAccepted)");
  const rateKey = source.indexOf('req.headers.get("x-utom-rate-key")');
  assert.ok(branch >= 0 && rateKey > branch);
  assert.match(source, /checkPublicApiRateLimit\(req, "v2-browser-read"/);
});

test("reset and verification emails use URL fragments and clients scrub tokens", () => {
  const reset = read("lib/reset-service.js");
  const verify = read("lib/email-verification.ts");
  const client = read("lib/client-one-time-token.ts");
  assert.match(reset, /resetUrl\.hash = `token=/);
  assert.match(verify, /verifyUrl\.hash = `token=/);
  assert.doesNotMatch(reset, /searchParams\.set\("token"/);
  assert.doesNotMatch(verify, /searchParams\.set\("token"/);
  assert.match(client, /window\.history\.replaceState/);
  assert.match(client, /window\.location\.hash/);
});

test("Turnstile is bound to contact action and configured hostname", () => {
  const route = read("app/api/contact/route.ts");
  const page = read("app/kapcsolat/page.tsx");
  assert.match(page, /data-action="contact"/);
  assert.match(route, /turnstile\.action !== "contact"/);
  assert.match(route, /configuredPublicHostnames\(process\.env\.TURNSTILE_ALLOWED_HOSTNAMES\)/);
  assert.match(route, /allowedHosts\.has\(hostname\)/);
  const verifyIndex = route.indexOf("turnstile.action");
  const emailLimitIndex = route.indexOf('scope: "contact-email"');
  assert.ok(verifyIndex >= 0 && emailLimitIndex > verifyIndex);
});

test("bounded streaming body helper rejects chunked oversized requests", () => {
  const source = read("lib/request-body.ts");
  assert.match(source, /req\.body\.getReader\(\)/);
  assert.match(source, /total > maxBytes/);
  assert.match(source, /reader\.cancel\("payload_too_large"\)/);
  for (const file of [
    "app/api/auth/login/route.ts",
    "app/api/auth/register/route.ts",
    "app/api/user/change-password/route.ts",
    "app/api/user/change-pin/route.ts",
    "app/api/contact/route.ts",
    "app/api/analyze/route.ts",
    "app/api/receive-feed/route.ts",
  ]) {
    assert.match(read(file), /read(?:Json|Text)BodyWithLimit/, file);
  }
});

test("username cooldown is transactionally fenced", () => {
  const source = read("app/api/auth/username-reset/route.ts");
  assert.match(source, /beginTransaction\(\)/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /username_changed_at = UTC_TIMESTAMP\(\)/);
  assert.match(source, /commit\(\)/);
});

test("remaining public related/source reads are shared-rate-limited", () => {
  assert.match(read("app/api/related/route.ts"), /checkPublicApiRateLimit\(req, "related"/);
  assert.match(read("app/api/sources/route.ts"), /checkPublicApiRateLimit\(req, "sources"/);
});

test("logout is origin protected", () => {
  assert.match(read("app/api/auth/logout/route.ts"), /requireTrustedOrigin\(req\)/);
});

test("trusted proxy IP headers are syntax-validated before becoming identities", () => {
  const source = read("lib/security.ts");
  assert.match(source, /import \{ isIP \} from "node:net"/);
  assert.match(source, /isIP\(candidate\)/);
  assert.match(source, /candidate\.length > 64/);
});
