"use strict";

const { RELATION_PREDICATES } = require("./relation-extraction");

function createMockRelationProvider(options = {}) {
  const resultFactory = options.resultFactory || (() => ({ relations: [] }));
  if (typeof resultFactory !== "function") throw new TypeError("resultFactory must be a function");
  return Object.freeze({
    name: "mock",
    model: String(options.model || "deterministic-mock-relation-v1"),
    async extractRelations(input, context = {}) {
      if (!input || typeof input.text !== "string") throw new TypeError("provider_input_invalid");
      return resultFactory(Object.freeze({
        text: input.text,
        contractVersion: input.contractVersion,
        allowedPredicates: RELATION_PREDICATES,
        context: Object.freeze({ requestId: context.requestId || null, runId: context.runId || null }),
      }));
    },
  });
}

function defaultRelationProvider() { return createMockRelationProvider(); }

module.exports = { createMockRelationProvider, defaultRelationProvider };
