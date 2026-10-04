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
    let result = validated.result;
    if (options.defaultSubjectEntityId != null) {
      if (!/^[1-9][0-9]*$/.test(String(options.defaultSubjectEntityId))) return { status: "invalid_output", providerCalls: 1, errors: ["subject_entity_id_invalid"], provider: provider.name, model: provider.model };
      const subjectEntityId = Number(options.defaultSubjectEntityId);
      result = Object.freeze({ ...result, claims: Object.freeze(result.claims.map((claim) => Object.freeze({ ...claim, subjectEntityId: claim.subjectEntityId == null ? subjectEntityId : claim.subjectEntityId }))) });
    }
    return { status: "completed", providerCalls: 1, provider: provider.name, model: provider.model, result };
  } catch (error) {
    return { status: "failed", providerCalls: 1, provider: provider.name, model: provider.model, error: String(error?.message || error).slice(0, 255) };
  }
}
module.exports = { runClaimExtraction };
