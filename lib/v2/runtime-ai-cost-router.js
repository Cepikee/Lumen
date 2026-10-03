"use strict";

const { isV2Enabled } = require("./feature-flags");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { decideRoute } = require("./ai-cost-router");
const { getProviderConfig } = require("./ai-provider-config");

function runCostRouter(input, options = {}) {
  if (!(options.enabled ?? isV2Enabled())) return { status: "disabled", contractVersion: CONTRACT_VERSIONS.costRouter, reads: 0, writes: 0, providerCalls: 0, decision: null };
  const providerConfig = getProviderConfig(options.env || process.env);
  const decision = decideRoute({ ...input, providerAvailable: providerConfig.paidEnabled && providerConfig.credentialPresent && input.providerAvailable !== false, provider: input.provider || providerConfig.provider, model: input.model || (input.preferLargeModel ? providerConfig.largeModel : providerConfig.smallModel) });
  if (decision.status !== "valid") return { status: "invalid_input", contractVersion: CONTRACT_VERSIONS.costRouter, reads: 0, writes: 0, providerCalls: 0, errors: decision.errors };
  return { status: "completed", contractVersion: CONTRACT_VERSIONS.costRouter, reads: 0, writes: 0, providerCalls: 0, decision: decision.result };
}

module.exports = { runCostRouter };
