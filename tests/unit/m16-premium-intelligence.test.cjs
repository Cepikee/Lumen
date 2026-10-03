"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePremiumInput, projectPremiumIntelligence } = require("../../lib/v2/premium-intelligence");

test("M16 validates exactly one bounded event/claim scope", () => {
  assert.equal(validatePremiumInput({}).status, "invalid");
  assert.deepEqual(validatePremiumInput({ eventId: "7", page: "2", limit: "10" }).result, { scope: { type: "event", id: 7 }, page: 2, limit: 10 });
  assert.match(validatePremiumInput({ eventId: "7", claimId: "8" }).errors.join(" "), /exactly_one_scope_required/);
  assert.match(validatePremiumInput({ claimId: "8", limit: "101" }).errors.join(" "), /limit_invalid/);
});

test("M16 projection is redacted, evidence-backed and has no entitlement bypass fields", () => {
  const result = projectPremiumIntelligence({
    scope: { type: "event", id: 4 },
    context: { id: 4, articles: [], entities: [] },
    comparison: { claims: [], sources: [] },
    conflicts: [{ id: 9, conflictType: "numeric", state: "open", severity: "review", detectedAt: "2026-01-01T00:00:00.000Z", explanationJson: { secret: true } }],
    history: [{ itemType: "claim", itemId: 10, validAt: "2026-01-01T00:00:00.000Z", displayAt: null, confidence: 0.2 }],
  });
  assert.equal(result.status, "ready");
  assert.equal(result.conflicts[0].type, "numeric");
  assert.equal("explanationJson" in result.conflicts[0], false);
  assert.equal("confidence" in result.history[0], false);
  assert.deepEqual(result.redaction, { rawProviderOutput: false, internalAudit: false, confidenceMechanics: false, costInternals: false });
});

test("M16 empty projection is stable and does not fabricate intelligence", () => {
  const result = projectPremiumIntelligence({ scope: { type: "claim", id: 2 }, context: null, comparison: null });
  assert.equal(result.status, "empty");
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.history, []);
});

console.log("M16 premium intelligence contract regression: PASS");
