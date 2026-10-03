"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CANONICAL_V2_FLAG, isV2Enabled } = require("../../lib/v2/feature-flags");
const { getRuntimeConfig } = require("../../lib/config/runtime");

test("V2 feature flag is canonical, narrow and fail-closed", () => {
  assert.equal(CANONICAL_V2_FLAG, "UTOM_V2_ENABLED");
  for (const value of [undefined, "", "0", "false", "no", "off", "garbage", " true "]) {
    assert.equal(isV2Enabled({ UTOM_OFFLINE_MODE: "false", UTOM_V2_ENABLED: value }), value === " true ", String(value));
  }
  for (const value of ["true", "TRUE", "1", "yes", "on"]) {
    assert.equal(isV2Enabled({ UTOM_OFFLINE_MODE: "false", UTOM_V2_ENABLED: value }), true, value);
  }
});

test("V2 flag remains independently testable in offline mode without enabling side effects", () => {
  assert.equal(isV2Enabled({ UTOM_OFFLINE_MODE: "true", UTOM_V2_ENABLED: "true" }), true);
  assert.equal(isV2Enabled({ UTOM_OFFLINE_MODE: "true", UTOM_V2_ENABLED: "false" }), false);
});

test("V2 disabled leaves existing offline capabilities unchanged", () => {
  const config = getRuntimeConfig({
    UTOM_OFFLINE_MODE: "true",
    UTOM_V2_ENABLED: "false",
    REAL_AI_ENABLED: "true",
    FEED_FETCH_ENABLED: "true",
    EMAIL_SEND_ENABLED: "true",
  });
  assert.equal(config.capabilities.v2, false);
  assert.equal(config.capabilities.realAi, false);
  assert.equal(config.capabilities.feedFetch, false);
  assert.equal(config.capabilities.emailSend, false);
});

test("flag evaluation does not leak process environment between calls", () => {
  const original = process.env.UTOM_V2_ENABLED;
  try {
    delete process.env.UTOM_V2_ENABLED;
    assert.equal(isV2Enabled(), false);
    process.env.UTOM_V2_ENABLED = "true";
    assert.equal(isV2Enabled(), true);
  } finally {
    if (original === undefined) delete process.env.UTOM_V2_ENABLED;
    else process.env.UTOM_V2_ENABLED = original;
  }
});

console.log("M1.5 feature flag contract: PASS");
