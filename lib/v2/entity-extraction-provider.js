"use strict";

const { ENTITY_TYPES } = require("./entity-extraction");

// The provider boundary deliberately exposes only canonical text and contract
// metadata. Provider-specific payloads never cross into the domain layer.
function createMockEntityProvider(options = {}) {
  const resultFactory = options.resultFactory || (() => ({ entities: [] }));
  if (typeof resultFactory !== "function") throw new TypeError("resultFactory must be a function");
  return Object.freeze({
    name: "mock",
    model: String(options.model || "deterministic-mock-entity-v1"),
    async extractEntities(input, context = {}) {
      if (!input || typeof input !== "object" || typeof input.text !== "string") throw new TypeError("provider_input_invalid");
      const result = await resultFactory(Object.freeze({
        text: input.text,
        contractVersion: input.contractVersion,
        allowedEntityTypes: ENTITY_TYPES,
        context: Object.freeze({ requestId: context.requestId || null, runId: context.runId || null }),
      }));
      return result;
    },
  });
}

function defaultEntityProvider() {
  return createMockEntityProvider();
}

module.exports = { createMockEntityProvider, defaultEntityProvider };
