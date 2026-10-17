"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getImageConfig, validateImageConfig } = require("../../lib/article-images/config");

test("image generation stays disabled by default and requires credentials", () => {
  const disabled = getImageConfig({}, process.cwd());
  assert.equal(validateImageConfig(disabled).reason, "disabled");
  const missing = getImageConfig({ IMAGE_GEN_ENABLED: "true" }, process.cwd());
  assert.equal(validateImageConfig(missing).reason, "missing_provider_credentials");
});

test("Cloudflare token compatibility alias never becomes a public config field", () => {
  const config = getImageConfig({ IMAGE_GEN_ENABLED: "true", CLOUDFLARE_ACCOUNT_ID: "account", CLOUDFLARE_API_TOKEN: "secret" }, process.cwd());
  assert.equal(validateImageConfig(config).ok, true);
  assert.equal(config.apiToken, "secret");
  assert.equal(Object.prototype.hasOwnProperty.call(config, "NEXT_PUBLIC_CLOUDFLARE_API_TOKEN"), false);
});
