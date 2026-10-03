"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEntityName, normalizeAlias } = require("../../lib/v2/entity-normalization");
const { CONTRACT_VERSIONS } = require("../../lib/v2/contract-versions");

test("M5 preserves Hungarian accents, casing for display, and punctuation while normalizing lookup form", () => {
  const result = normalizeEntityName("  Mészáros\u00A0Lőrinc-Group  ");
  assert.equal(result.status, "valid");
  assert.equal(result.displayName, "Mészáros Lőrinc-Group");
  assert.equal(result.normalizedName, "mészáros lőrinc-group");
  assert.equal(result.normalizationVersion, CONTRACT_VERSIONS.vocabulary);
});

test("M5 normalization removes invisible characters and is deterministic", () => {
  const first = normalizeEntityName("OTP\u200B  Bank");
  const second = normalizeEntityName("OTP Bank");
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
});

test("M5 keeps diacritic variants distinct instead of implying a merge", () => {
  const accented = normalizeEntityName("Mészáros");
  const plain = normalizeEntityName("Meszaros");
  assert.notEqual(accented.normalizedName, plain.normalizedName);
});

test("M5 alias output keeps observed alias separate from canonical resolution", () => {
  const alias = normalizeAlias("  OTP  Bank ", { aliasType: "observed" });
  assert.equal(alias.alias, "OTP Bank");
  assert.equal(alias.normalizedAlias, "otp bank");
  assert.equal(alias.aliasType, "observed");
  assert.equal(Object.prototype.hasOwnProperty.call(alias, "entityId"), false);
});

test("M5 rejects empty, non-string and malformed-language input", () => {
  assert.deepEqual(normalizeEntityName("   "), { status: "invalid", reason: "name_empty" });
  assert.deepEqual(normalizeEntityName(null), { status: "invalid", reason: "name_must_be_string" });
  assert.deepEqual(normalizeEntityName("OTP", { language: "_" }), { status: "invalid", reason: "language_invalid" });
});
