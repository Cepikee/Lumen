"use strict";

const { isV2Enabled } = require("./feature-flags");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { defaultClaimProvider } = require("./claim-extraction-provider");
const { validateClaimInput, validateClaimResult } = require("./claim-extraction");

async function runClaimExtraction(input, context = {}, options = {}) {
  if (!(options.enabled ?? isV2Enabled())) return { status: "disabled", providerCalls: 0, result: null };
  const validInput = validateClaimInput(input);
  if (validInput.status !== "valid") return { status: "invalid_input", providerCalls: 0, errors: validInput.errors };
  const provider = options.provider || defaultClaimProvider();
  try {
    const raw = await provider.extractClaims({ text: input.text, contractVersion: CONTRACT_VERSIONS.extractionSchema }, context);
    const validated = validateClaimResult(input, raw);
    if (validated.status !== "valid") return { status: "invalid_output", providerCalls: 1, errors: validated.errors, provider: provider.name, model: provider.model };
    return { status: "completed", providerCalls: 1, provider: provider.name, model: provider.model, result: validated.result };
  } catch (error) {
    return { status: "failed", providerCalls: 1, provider: provider.name, model: provider.model, error: String(error?.message || error).slice(0, 255) };
  }
}
module.exports = { runClaimExtraction };
