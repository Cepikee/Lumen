"use strict";

const { isV2Enabled } = require("./feature-flags");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { canonicalText, validateEntityExtractionInput, validateEntityExtractionResult } = require("./entity-extraction");
const { defaultEntityProvider } = require("./entity-extraction-provider");

async function runEntityExtraction(envelope, context = {}, options = {}) {
  const enabled = options.enabled ?? isV2Enabled();
  if (!enabled) return { status: "disabled", providerCalls: 0, result: null };
  const input = validateEntityExtractionInput(envelope);
  if (input.status !== "valid") return { status: "invalid_input", providerCalls: 0, errors: input.errors };
  const provider = options.provider || defaultEntityProvider();
  const providerInput = Object.freeze({
    text: canonicalText(envelope),
    contractVersion: CONTRACT_VERSIONS.extractionSchema,
    allowedEntityTypes: Object.freeze(["person", "company", "organization", "location", "project", "product", "topic"]),
  });
  try {
    const raw = await provider.extractEntities(providerInput, context);
    const validated = validateEntityExtractionResult(envelope, raw);
    if (validated.status !== "valid") return { status: "invalid_output", providerCalls: 1, errors: validated.errors, provider: provider.name, model: provider.model };
    return { status: "completed", providerCalls: 1, provider: provider.name, model: provider.model, result: validated.result };
  } catch (error) {
    return { status: "failed", providerCalls: 1, provider: provider.name, model: provider.model, error: String(error?.message || error).slice(0, 255) };
  }
}

module.exports = { runEntityExtraction };
