"use strict";

const { AI_COST_POLICY } = require("./ai-cost-policy");

function getProviderConfig(env = process.env) {
  const production = String(env.NODE_ENV || "development") === "production";
  const paidEnabled = production && String(env.UTOM_PAID_AI_ENABLED || "").toLowerCase() === "true";
  return Object.freeze({
    provider: AI_COST_POLICY.provider,
    secondaryProvider: AI_COST_POLICY.secondaryProvider,
    paidEnabled,
    smallModel: String(env.AI_SMALL_MODEL || "").trim() || null,
    largeModel: String(env.AI_LARGE_MODEL || "").trim() || null,
    credentialPresent: Boolean(String(env.OPENAI_API_KEY || "").trim()),
  });
}

module.exports = { getProviderConfig };
