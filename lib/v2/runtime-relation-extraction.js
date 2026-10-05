"use strict";

const { isV2Enabled } = require("./feature-flags");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { defaultRelationProvider } = require("./relation-extraction-provider");
const { validateRelationInput, validateRelationResult } = require("./relation-extraction");

async function runRelationExtraction(input, context = {}, options = {}) {
  const enabled = options.enabled ?? isV2Enabled();
  if (!enabled) return { status: "disabled", providerCalls: 0, result: null };
  const validInput = validateRelationInput(input);
  if (validInput.status !== "valid") return { status: "invalid_input", providerCalls: 0, errors: validInput.errors };
  const provider = options.provider || defaultRelationProvider();
  try {
    const raw = await provider.extractRelations({ text: input.text, entities: Array.isArray(input.entities) ? input.entities : [], contractVersion: CONTRACT_VERSIONS.resolver }, context);
    const validated = validateRelationResult(input, raw);
    if (validated.status !== "valid") return { status: "invalid_output", providerCalls: 1, errors: validated.errors, provider: provider.name, model: provider.model };
    return { status: "completed", providerCalls: 1, provider: provider.name, model: provider.model, result: validated.result };
  } catch (error) {
    return { status: "failed", providerCalls: 1, provider: provider.name, model: provider.model, error: String(error?.message || error).slice(0, 255) };
  }
}

module.exports = { runRelationExtraction };
