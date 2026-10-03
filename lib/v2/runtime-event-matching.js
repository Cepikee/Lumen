"use strict";

const { isV2Enabled } = require("./feature-flags");
const { validateEventCandidate } = require("./event-matching");

function runEventMatching(input, options = {}) {
  if (!(options.enabled ?? isV2Enabled())) return { status: "disabled", providerCalls: 0, reads: 0, writes: 0, candidate: null };
  const validated = validateEventCandidate(input);
  if (validated.status !== "valid") return { status: "invalid_input", providerCalls: 0, reads: 0, writes: 0, errors: validated.errors };
  return { status: "candidate", providerCalls: 0, reads: 0, writes: 0, candidate: validated.result };
}

module.exports = { runEventMatching };
