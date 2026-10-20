"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEvidenceBackedRelationCandidates } = require("../../lib/v2/shadow-relation-projection");

function fixture(overrides = {}) {
  const textSpan = "Anna az Acme Kft. vezérigazgatója.";
  return {
    articleId: 7,
    claims: [{
      subjectEntityId: 31,
      predicate: "CEO_OF",
      objectEntityId: 32,
      claimType: "entity",
      status: "observed",
      confidence: 0.94,
      supportType: "support",
      attributionType: "unknown",
      attributionEntityId: null,
      polarity: "affirmed",
      uncertainty: false,
      conditional: false,
      modality: "asserted",
      validFrom: null,
      validUntil: null,
      evidence: { start: 0, end: textSpan.length, textSpan },
    }],
    persistedClaims: [{ claimId: 41, evidenceId: 51 }],
    entities: [{ entityType: "person" }, { entityType: "organization" }],
    resolutions: [{ result: { entityId: 31, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }, { result: { entityId: 32, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }],
    ...overrides,
  };
}

test("validated claim with exact persisted evidence and resolved endpoints creates one relation", () => {
  const result = buildEvidenceBackedRelationCandidates(fixture());
  assert.equal(result.status, "completed");
  assert.equal(result.providerCalls, 0);
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].relation, {
    subjectEntityId: 31, predicate: "CEO_OF", objectEntityId: 32, confidence: 0.94,
    supportType: "support", validFrom: null, validUntil: null,
    evidence: fixture().claims[0].evidence,
  });
  assert.deepEqual(result.candidates[0].semanticSource, { type: "validated_claim", claimId: 41, evidenceId: 51 });
});

test("rerun is deterministic but an otherwise identical second article remains article-local", () => {
  const first = buildEvidenceBackedRelationCandidates(fixture()).candidates[0];
  const retry = buildEvidenceBackedRelationCandidates(fixture()).candidates[0];
  const otherArticle = buildEvidenceBackedRelationCandidates(fixture({ articleId: 8 })).candidates[0];
  assert.equal(first.operationKey, retry.operationKey);
  assert.notEqual(first.operationKey, otherArticle.operationKey);
});

test("missing evidence and unresolved endpoints abstain", () => {
  const missingEvidence = fixture({ persistedClaims: [{ claimId: 41, evidenceId: null }] });
  const unresolvedSubject = fixture({ resolutions: [{ result: { entityId: null, resolutionStatus: "unresolved", entityStatus: "unresolved", provisional: true } }, { result: { entityId: 32, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }] });
  const unresolvedObject = fixture({ claims: [{ ...fixture().claims[0], objectEntityId: null }] });
  for (const input of [missingEvidence, unresolvedSubject, unresolvedObject]) {
    assert.equal(buildEvidenceBackedRelationCandidates(input).candidates.length, 0);
  }
});

test("negation, conditionality, uncertainty and attribution never create a positive relation", () => {
  const variants = [
    { polarity: "negated" },
    { conditional: true, modality: "conditional" },
    { uncertainty: true },
    { attributionType: "reported", attributionEntityId: 31 },
  ];
  for (const change of variants) {
    const input = fixture({ claims: [{ ...fixture().claims[0], ...change }] });
    assert.equal(buildEvidenceBackedRelationCandidates(input).candidates.length, 0);
  }
});

test("ambiguous or malformed subject/object semantics abstain without proximity inference", () => {
  const ambiguous = fixture({ claims: [{ ...fixture().claims[0], objectEntityId: null }], entities: [{}, {}, {}], resolutions: [{ result: { entityId: 31, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }, { result: { entityId: 32, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }, { result: { entityId: 33, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }] });
  const sameEndpoint = fixture({ claims: [{ ...fixture().claims[0], objectEntityId: 31 }] });
  const unsupported = fixture({ claims: [{ ...fixture().claims[0], predicate: "ANNOUNCED" }] });
  for (const input of [ambiguous, sameEndpoint, unsupported]) {
    assert.equal(buildEvidenceBackedRelationCandidates(input).candidates.length, 0);
  }
});

test("explicit temporal bounds are retained and publication time is not invented", () => {
  const undated = buildEvidenceBackedRelationCandidates({ ...fixture(), publicationTime: "2026-10-19T10:00:00Z" }).candidates[0].relation;
  assert.deepEqual([undated.validFrom, undated.validUntil], [null, null]);
  const dated = buildEvidenceBackedRelationCandidates(fixture({ claims: [{ ...fixture().claims[0], validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-12-31T23:59:59Z" }] })).candidates[0].relation;
  assert.deepEqual([dated.validFrom, dated.validUntil], ["2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z"]);
});

test("claim/persistence and entity/resolution shape mismatches fail before persistence", () => {
  assert.throws(() => buildEvidenceBackedRelationCandidates(fixture({ persistedClaims: [] })), /relation_claim_persistence_mismatch/);
  assert.throws(() => buildEvidenceBackedRelationCandidates(fixture({ resolutions: [] })), /relation_entity_resolution_mismatch/);
});
