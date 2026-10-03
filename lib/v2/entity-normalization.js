"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const LANGUAGE_PATTERN = /^[A-Za-z][A-Za-z0-9-]{1,15}$/;

function normalizeEntityName(value, options = {}) {
  if (typeof value !== "string") return { status: "invalid", reason: "name_must_be_string" };
  const language = String(options.language || "hu").trim().toLowerCase();
  if (!LANGUAGE_PATTERN.test(language)) return { status: "invalid", reason: "language_invalid" };
  const displayName = value.normalize("NFC").replace(ZERO_WIDTH, "").replace(/\s+/gu, " ").trim();
  if (!displayName) return { status: "invalid", reason: "name_empty" };
  let normalizedName;
  try {
    normalizedName = displayName.toLocaleLowerCase(language);
  } catch {
    return { status: "invalid", reason: "language_unsupported" };
  }
  return Object.freeze({
    status: "valid",
    normalizationVersion: CONTRACT_VERSIONS.vocabulary,
    language,
    displayName,
    normalizedName,
  });
}

function normalizeAlias(value, options = {}) {
  const result = normalizeEntityName(value, options);
  if (result.status !== "valid") return result;
  return Object.freeze({ ...result, alias: result.displayName, normalizedAlias: result.normalizedName, aliasType: options.aliasType || "observed" });
}

module.exports = { normalizeEntityName, normalizeAlias };
