const test = require("node:test");
const assert = require("node:assert/strict");
const { validateClaimResult } = require("../../lib/v2/claim-extraction");
const { createMockClaimProvider } = require("../../lib/v2/claim-extraction-provider");
const { runClaimExtraction } = require("../../lib/v2/runtime-claim-extraction");
const { claimObservationKey, persistClaimsWithEvidence } = require("../../lib/v2/claim-extraction-repository");

const input = { articleId: 11, sourceId: 4, extractionRunId: 8, text: "A vállalat 12 millió forintot költött." };
const rawClaim = { subjectEntityId: 1, predicate: "SPENT_AMOUNT", claimType: "numeric", value: { amount: 12000000, unit: "HUF" }, normalizedValue: "12000000 HUF", confidence: 0.88, polarity: "affirmed", uncertainty: false, conditional: false, evidence: { start: 0, end: input.text.length, textSpan: input.text } };

test("M8 validates atomic claims while preserving numeric, temporal and semantic qualifiers", () => {
  const result = validateClaimResult(input, { claims: [rawClaim] });
  assert.equal(result.status, "valid");
  assert.equal(result.result.claims[0].value.unit, "HUF");
  assert.equal(result.result.claims[0].claimType, "numeric");
  const attributed = validateClaimResult(input, { claims: [{ ...rawClaim, claimText: input.text, attribution: { type: "quoted", entityId: 7 } }] });
  assert.equal(attributed.result.claims[0].attributionType, "quoted");
  assert.equal(attributed.result.claims[0].attributionEntityId, 7);
  assert.equal(validateClaimResult(input, { claims: [{ ...rawClaim, evidence: { ...rawClaim.evidence, textSpan: "wrong" } }] }).status, "invalid");
  assert.equal(validateClaimResult(input, { claims: [{ ...rawClaim, polarity: "negated", conditional: true, validFrom: "2026-01-01T00:00:00Z" }] }).status, "valid");
});

test("M8 rejects unsupported claim shapes and keeps unresolved entity references explicit", () => {
  assert.equal(validateClaimResult(input, { claims: [{ ...rawClaim, subjectEntityId: null, predicate: "not valid" }] }).status, "invalid");
  assert.equal(validateClaimResult(input, { claims: [{ ...rawClaim, claimType: "fact" }] }).status, "invalid");
  const unresolved = validateClaimResult(input, { claims: [{ ...rawClaim, subjectEntityId: null }] });
  assert.equal(unresolved.status, "valid");
  assert.equal(unresolved.result.claims[0].subjectEntityId, null);
  assert.equal(validateClaimResult(input, { claims: [{ ...rawClaim, value: { amount: Number.NaN, unit: "HUF" } }] }).status, "invalid");
  assert.equal(validateClaimResult(input, { claims: [{ ...rawClaim, isQuestion: true }] }).status, "invalid");
});

test("M8 feature OFF performs no provider call and ON validates mock output", async () => {
  let calls = 0;
  const provider = createMockClaimProvider({ resultFactory: async () => { calls += 1; return { claims: [] }; } });
  assert.equal((await runClaimExtraction(input, {}, { enabled: false, provider })).providerCalls, 0);
  assert.equal(calls, 0);
  assert.equal((await runClaimExtraction(input, {}, { enabled: true, provider })).status, "completed");
  assert.equal(calls, 1);
});

test("M8 persistence uses stable observation/evidence identity and caller-owned transaction", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/v2_claim_groups/.test(sql)) return [{ insertId: 31, affectedRows: 1 }];
    if (/v2_claims/.test(sql)) return [{ insertId: 32, affectedRows: 1 }];
    if (/v2_claim_evidence/.test(sql)) return [{ insertId: 33, affectedRows: 1 }];
    throw new Error("unexpected_sql");
  } };
  const validated = validateClaimResult(input, { claims: [rawClaim] });
  const result = await persistClaimsWithEvidence(connection, { claims: validated.result.claims, articleId: 11, sourceId: 4, extractionRunId: 8 });
  assert.deepEqual([result.claims[0].claimId, result.claims[0].evidenceId], [32, 33]);
  const evidenceCall = calls.find((call) => /v2_claim_evidence/.test(call.sql));
  assert.equal(evidenceCall.params.length, 9);
  assert.equal(claimObservationKey({ articleId: 11, sourceId: 4, extractionRunId: 8, claim: validated.result.claims[0] }), claimObservationKey({ articleId: 11, sourceId: 4, extractionRunId: 8, claim: validated.result.claims[0] }));
  assert.equal(calls.some((call) => /START TRANSACTION|COMMIT|ROLLBACK/.test(call.sql)), false);
});

console.log("M8 claim extraction contract regression: PASS");
