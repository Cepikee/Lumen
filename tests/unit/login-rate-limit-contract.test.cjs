"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { getLoginAttemptScope } = require("../../lib/login-rate-limit");
const loginRoute = fs.readFileSync("app/api/auth/login/route.ts", "utf8");

test("login route applies the scoped attempt query", () => {
  assert.match(loginRoute, /getLoginAttemptScope\(ip, email\)/);
  assert.match(loginRoute, /WHERE \$\{attemptScope\.where\}/);
  assert.match(loginRoute, /attemptScope\.params/);
});

test("untrusted proxy fallback scopes login throttling per email", () => {
  assert.deepEqual(getLoginAttemptScope("direct", "alice@example.invalid"), {
    where: "ip = ? AND email = ?",
    params: ["direct", "alice@example.invalid"],
  });
  assert.deepEqual(getLoginAttemptScope("unknown", "bob@example.invalid"), {
    where: "ip = ? AND email = ?",
    params: ["unknown", "bob@example.invalid"],
  });
});

test("trusted client IP keeps the shared per-IP login limit", () => {
  assert.deepEqual(getLoginAttemptScope("198.51.100.10", "alice@example.invalid"), {
    where: "ip = ?",
    params: ["198.51.100.10"],
  });
});

console.log("login rate-limit scope regression: PASS");
