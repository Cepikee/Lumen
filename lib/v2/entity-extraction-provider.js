"use strict";

const { ENTITY_TYPES } = require("./entity-extraction");
const { extractEntities } = require("./deterministic-semantic");

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

function deterministicEntityConfidence(entity) {
  const type = String(entity?.type || "");
  const mention = String(entity?.mention || "");
  // Explicit surface type markers can safely meet Q06's exact-match
  // threshold. Resolution still requires one accepted canonical/alias hit
  // with the same type and language.
  if (type === "organization" && /(?:\b(?:zrt|kft|nyrt)\.?$|\b(?:minisztérium|önkormányzat|hatóság|egyetem|bíróság|törvényszék|párt|bank)$)/iu.test(mention)) return 0.95;
  if (type === "project" && /\b(?:program|projekt|beruházás|fejlesztés|felújítás|építés|beszerzés)\b/iu.test(mention)) return 0.95;
  return type === "person" || type === "organization" ? 0.93 : 0.86;
}

function createDeterministicEntityProvider(options = {}) {
  return Object.freeze({
    name: "deterministic-semantic",
    model: String(options.model || "deterministic-semantic-entity-v1"),
    async extractEntities(input) {
      if (!input || typeof input.text !== "string") throw new TypeError("provider_input_invalid");
      let searchFrom = 0;
      return {
        entities: extractEntities(input.text).map((entity) => {
          const mention = String(entity.mention || "");
          const exactStart = input.text.indexOf(mention, searchFrom);
          const start = exactStart >= 0 ? exactStart : entity.start;
          const end = start + mention.length;
          if (exactStart >= 0) searchFrom = end;
          return {
          mentionText: entity.mention,
          normalizedCandidateName: entity.normalized,
          entityType: entity.type,
          confidence: deterministicEntityConfidence(entity),
          evidence: { start, end },
          };
        }),
      };
    },
  });
}

module.exports = { createMockEntityProvider, createDeterministicEntityProvider, defaultEntityProvider, deterministicEntityConfidence };
