"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { assertCapability, getRuntimeConfig } = require("../../lib/config/runtime");

test("offline is the safe default and overrides opt-in flags", () => {
  const config = getRuntimeConfig({
    AI_PROVIDER: "openai",
    REAL_AI_ENABLED: "true",
    DB_WRITE_ENABLED: "true",
    EMAIL_SEND_ENABLED: "true",
  });
  assert.equal(config.offlineMode, true);
  assert.equal(config.aiProvider, "mock");
  assert.ok(Object.values(config.capabilities).every((value) => value === false));
});

test("capabilities require both online mode and explicit opt-in", () => {
  const config = getRuntimeConfig({
    UTOM_OFFLINE_MODE: "false",
    AI_PROVIDER: "openai",
    REAL_AI_ENABLED: "true",
    DB_WRITE_ENABLED: "true",
  });
  assert.equal(config.capabilities.realAi, true);
  assert.equal(config.capabilities.databaseWrite, true);
  assert.equal(config.capabilities.emailSend, false);
});

test("blocked capabilities fail closed with a stable error code", () => {
  assert.throws(
    () => assertCapability("payments", getRuntimeConfig({})),
    (error) => error.code === "UTOM_OPERATION_BLOCKED" && error.capability === "payments",
  );
});
