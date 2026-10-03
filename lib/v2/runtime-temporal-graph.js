"use strict";

const { isV2Enabled } = require("./feature-flags");
const { validateTemporalProjection, projectAsOf } = require("./temporal-graph");

function runTemporalProjection(input, options = {}) {
  if (!(options.enabled ?? isV2Enabled())) return { status: "disabled", reads: 0, writes: 0, providerCalls: 0, projection: null };
  const valid = validateTemporalProjection(input);
  if (valid.status !== "valid") return { status: "invalid_input", reads: 0, writes: 0, providerCalls: 0, errors: valid.errors };
  return { status: "completed", reads: 0, writes: 0, providerCalls: 0, projection: { ...valid.result, items: projectAsOf(valid.result.items, valid.result.asOf) } };
}

module.exports = { runTemporalProjection };
