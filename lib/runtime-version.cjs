"use strict";

const MINIMUM_NODE_VERSION = "24.22.1";

function parseVersion(value) {
  const match = String(value || "").trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-|$)/);
  if (!match) return null;
  return match.slice(1).map(Number);
}

function isSupportedNodeVersion(value, minimum = MINIMUM_NODE_VERSION) {
  if (String(value || "").trim().replace(/^v/, "").includes("-")) return false;
  const actual = parseVersion(value);
  const required = parseVersion(minimum);
  if (!actual || !required || actual[0] !== 24) return false;
  for (let index = 0; index < 3; index++) {
    if (actual[index] !== required[index]) return actual[index] > required[index];
  }
  return true;
}

module.exports = { MINIMUM_NODE_VERSION, isSupportedNodeVersion, parseVersion };
