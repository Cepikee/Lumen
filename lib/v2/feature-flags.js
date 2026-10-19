"use strict";

const { enabled, getRuntimeConfig } = require("../config/runtime");

const CANONICAL_V2_FLAG = "UTOM_V2_ENABLED";
const V2_SHADOW_FLAG = "UTOM_V2_SHADOW_ENABLED";

function isV2Enabled(env = process.env) {
  return getRuntimeConfig(env).capabilities.v2 === true;
}

function isV2ShadowEnabled(env = process.env) {
  return isV2Enabled(env) && enabled(env[V2_SHADOW_FLAG]);
}

module.exports = { CANONICAL_V2_FLAG, V2_SHADOW_FLAG, isV2Enabled, isV2ShadowEnabled };
