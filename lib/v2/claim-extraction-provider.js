"use strict";

function createMockClaimProvider(options = {}) {
  const resultFactory = options.resultFactory || (() => ({ claims: [] }));
  if (typeof resultFactory !== "function") throw new TypeError("resultFactory must be a function");
  return Object.freeze({
    name: "mock",
    model: String(options.model || "deterministic-mock-claim-v1"),
    async extractClaims(input, context = {}) {
      if (!input || typeof input.text !== "string") throw new TypeError("provider_input_invalid");
      return resultFactory(Object.freeze({ text: input.text, contractVersion: input.contractVersion, context: Object.freeze({ requestId: context.requestId || null, runId: context.runId || null }) }));
    },
  });
}
function defaultClaimProvider() { return createMockClaimProvider(); }
module.exports = { createMockClaimProvider, defaultClaimProvider };
