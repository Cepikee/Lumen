"use strict";

const { getRuntimeConfig } = require("../config/runtime");

const CANONICAL_V2_FLAG = "UTOM_V2_ENABLED";

function isV2Enabled(env = process.env) {
  return getRuntimeConfig(env).capabilities.v2 === true;
}

module.exports = { CANONICAL_V2_FLAG, isV2Enabled };
