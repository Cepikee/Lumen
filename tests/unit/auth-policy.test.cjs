"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePassword, validatePin } = require("../../lib/auth-policy");

test("password policy is shared and bounded", () => {
  assert.equal(validatePassword("short1").valid, false);
  assert.equal(validatePassword("onlyletters").valid, false);
  assert.equal(validatePassword("12345678").valid, false);
  assert.equal(validatePassword("validPass123").valid, true);
  assert.equal(validatePassword(`A1${"x".repeat(127)}`).valid, false);
});

test("PIN policy accepts exactly four digits", () => {
  assert.equal(validatePin("1234"), true);
  assert.equal(validatePin(1234), false);
  assert.equal(validatePin("12345"), false);
  assert.equal(validatePin("12a4"), false);
});
