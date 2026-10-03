"use strict";

const { isV2Enabled } = require("./feature-flags");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { detectConflict } = require("./conflict-history");

function runConflictDetection(input, options = {}) {
  if (!(options.enabled ?? isV2Enabled())) return { status: "disabled", contractVersion: CONTRACT_VERSIONS.conflictHistory, reads: 0, writes: 0, providerCalls: 0, candidate: null };
  if (!input || typeof input !== "object") return { status: "invalid_input", contractVersion: CONTRACT_VERSIONS.conflictHistory, reads: 0, writes: 0, providerCalls: 0, errors: ["input_required"] };
  try {
    const result = detectConflict(input.left ?? input.claimA, input.right ?? input.claimB);
    if (result.status === "invalid") return { status: "invalid_input", contractVersion: CONTRACT_VERSIONS.conflictHistory, reads: 0, writes: 0, providerCalls: 0, errors: result.errors };
    return { status: "completed", contractVersion: CONTRACT_VERSIONS.conflictHistory, reads: 0, writes: 0, providerCalls: 0, candidate: result.status === "candidate" ? result : null, result };
  } catch (error) {
    return { status: "invalid_input", contractVersion: CONTRACT_VERSIONS.conflictHistory, reads: 0, writes: 0, providerCalls: 0, errors: [error.message] };
  }
}

module.exports = { runConflictDetection };
