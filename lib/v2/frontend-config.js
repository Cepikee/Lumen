"use strict";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isFrontendV2Enabled(value = process.env.NEXT_PUBLIC_UTOM_V2_ENABLED) {
  if (value == null || value === "") return false;
  return TRUE_VALUES.has(String(value).trim().toLowerCase());
}

module.exports = { isFrontendV2Enabled };
