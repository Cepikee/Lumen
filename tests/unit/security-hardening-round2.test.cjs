"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("recaptcha verification binds token to action and production hostname", () => {
  const source = read("lib/recaptcha.ts");
  assert.match(source, /new URLSearchParams\(\{ secret, response: normalizedToken \}\)/);
  assert.match(source, /AbortSignal\.timeout\(10_000\)/);
  assert.match(source, /data\.action !== options\.expectedAction/);
  const hosts = read("lib/public-hostnames.ts");
  assert.match(hosts, /providerSpecific/);
  assert.match(source, /configuredPublicHostnames\(process\.env\.RECAPTCHA_ALLOWED_HOSTNAMES\)/);
  assert.match(source, /allowedHosts\.has\(hostname\)/);
});

test("login verifies captcha and has independent account and IP request gates", () => {
  const source = read("app/api/auth/login/route.ts");
  assert.match(source, /expectedAction: "login"/);
  assert.match(source, /scope: "login-account-request"/);
  assert.match(source, /scope: "login-ip-request"/);
  assert.match(source, /WHERE email = \?/);
  assert.match(source, /INTERVAL 30 MINUTE/);
});

test("credential mutations are same-origin, rate limited and rotate sessions", () => {
  const password = read("app/api/user/change-password/route.ts");
  const pin = read("app/api/user/change-pin/route.ts");
  for (const source of [password, pin]) {
    assert.match(source, /requireTrustedOrigin\(req\)/);
    assert.match(source, /consumeRateLimitFailClosed/);
    assert.match(source, /DELETE FROM user_sessions WHERE user_id = \?/);
    assert.match(source, /createSession\(userId, response, false\)/);
  }
});

test("all session-authenticated profile mutations require trusted origin", () => {
  for (const file of [
    "app/api/user/avatar/route.ts",
    "app/api/auth/avatar/route.ts",
    "app/api/user/frame/route.ts",
    "app/api/user/update/route.ts",
  ]) {
    assert.match(read(file), /requireTrustedOrigin\(req\)/, file);
  }
});

test("public discovery APIs have bounded query shapes and shared rate limits", () => {
  const summaries = read("app/api/summaries/route.ts");
  const trends = read("app/api/trends/route.ts");
  const history = read("app/api/trend-history/route.ts");
  const stats = read("app/api/trends/stats/route.ts");
  assert.match(summaries, /checkPublicApiRateLimit\(req, "summaries", 240/);
  assert.match(summaries, /\n\s*200\n\s*\);/);
  assert.match(summaries, /\n\s*50\n\s*\);/);
  assert.match(summaries, /slice\(0, 120\)/);
  assert.match(trends, /MAX_TRENDS_RESULTS = 500/);
  assert.match(trends, /MAX_CUSTOM_DAYS = 366/);
  assert.match(history, /MAX_KEYWORD_LENGTH = 100/);
  assert.match(stats, /checkPublicApiRateLimit\(req, "trend-stats", 60/);
});

test("feed ingestion hard caps article content at the shared core boundary", () => {
  const source = read("lib/feed-ingestion.js");
  assert.match(source, /MAX_FEED_CONTENT_LENGTH = 100_000/);
  assert.match(source, /content: String\(item\.content \|\| ""\)\.slice\(0, MAX_FEED_CONTENT_LENGTH\)/);
  assert.match(source, /boundedItem\.content/);
});

test("bootstrap runtime is bundled locally and CSP blocks risky fallback capabilities", () => {
  const layout = read("app/layout.tsx");
  const bootstrap = read("components/BootstrapClient.tsx");
  const config = read("next.config.ts");
  assert.doesNotMatch(layout, /cdn\.jsdelivr\.net/);
  assert.match(layout, /<BootstrapClient \/>/);
  assert.match(bootstrap, /import\("bootstrap"\)/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /base-uri 'self'/);
  assert.match(config, /form-action 'self'/);
});

test("CI uses current action majors, npm ci and least-privilege repository permissions", () => {
  for (const file of [".github/workflows/ci.yml", ".github/workflows/build.yml", ".github/workflows/lint.yml", ".github/workflows/depcheck.yml", ".github/workflows/fetch-444.yml"]) {
    const source = read(file);
    assert.doesNotMatch(source, /actions\/checkout@v2|actions\/setup-node@v2|npm install(?:\s|$)/, file);
    assert.match(source, /permissions:\s*\n\s*contents: read/, file);
    assert.match(source, /npm ci/, file);
  }
});
