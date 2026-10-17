"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createCircuitBreaker } = require("../../lib/article-images/circuit-breaker");

test("circuit opens after three failures and closes only after cooldown", () => {
  let now = 1_000;
  const breaker = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 5_000, now: () => now });
  breaker.failure();
  breaker.failure();
  assert.equal(breaker.canRequest(), true);
  breaker.failure();
  assert.equal(breaker.state(), "open");
  assert.equal(breaker.canRequest(), false);
  now += 4_999;
  assert.equal(breaker.canRequest(), false);
  now += 1;
  assert.equal(breaker.canRequest(), true);
  assert.equal(breaker.state(), "closed");
});

test("success resets consecutive failure count", () => {
  const breaker = createCircuitBreaker({ failureThreshold: 3 });
  breaker.failure();
  breaker.failure();
  breaker.success();
  breaker.failure();
  assert.equal(breaker.canRequest(), true);
});
