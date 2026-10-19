"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEvidenceBackedEventCandidates } = require("../../lib/v2/shadow-event-projection");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { createDeterministicEntityProvider } = require("../../lib/v2/entity-extraction-provider");
const { runEntityExtraction } = require("../../lib/v2/runtime-entity-extraction");
const { createDeterministicClaimProvider } = require("../../lib/v2/claim-extraction-provider");
const { runClaimExtraction } = require("../../lib/v2/runtime-claim-extraction");

function fixture(overrides = {}) {
  const textSpan = "Az Acme új buszokat vásárol.";
  return {
    articleId: 7,
    claims: [{
      subjectEntityId: 31,
      predicate: "BUS_PURCHASE",
      value: "bus-purchase",
      claimType: "text",
      status: "observed",
      confidence: 0.91,
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
    entities: [],
    resolutions: [],
    ...overrides,
  };
}

test("supported claim with persisted exact evidence creates one article-local candidate", () => {
  const result = buildEvidenceBackedEventCandidates(fixture());
  assert.equal(result.status, "completed");
  assert.equal(result.providerCalls, 0);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].eventType, "bus_purchase");
  assert.equal(result.candidates[0].evidenceId, 51);
  assert.deepEqual(result.candidates[0].entities.map(({ entityId, role, evidenceId }) => ({ entityId, role, evidenceId })), [{ entityId: 31, role: "subject", evidenceId: 51 }]);
});

test("current deterministic providers produce a supported evidence-backed event without research code", async () => {
  const envelope = createIngestionEnvelope({
    originalUrl: "https://example.test/event",
    title: "Buszbeszerzés",
    content: "Az Acme Kft. új buszokat vásárol.",
    source: "example.test",
    publishedAt: "2026-10-19T00:00:00Z",
  }).envelope;
  const entities = await runEntityExtraction(envelope, {}, { enabled: true, provider: createDeterministicEntityProvider() });
  const text = `${envelope.article.title}\n${envelope.article.contentText}`;
  const claims = await runClaimExtraction({ text, articleId: 7 }, {}, { enabled: true, provider: createDeterministicClaimProvider() });
  assert.equal(entities.status, "completed");
  assert.equal(claims.status, "completed");
  const result = buildEvidenceBackedEventCandidates({
    articleId: 7,
    claims: claims.result.claims,
    persistedClaims: [{ claimId: 41, evidenceId: 51 }],
    entities: entities.result.entities,
    resolutions: [{ result: { entityId: 31 } }],
  });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].entities[0].entityId, 31);
});

test("missing persisted evidence, negation, conditionality and attribution all abstain", () => {
  const cases = [
    fixture({ persistedClaims: [{ claimId: 41, evidenceId: null }] }),
    fixture({ claims: [{ ...fixture().claims[0], polarity: "negated" }] }),
    fixture({ claims: [{ ...fixture().claims[0], conditional: true, modality: "conditional" }] }),
    fixture({ claims: [{ ...fixture().claims[0], attributionType: "reported", attributionEntityId: 99 }] }),
  ];
  const reasons = cases.map((input) => {
    const result = buildEvidenceBackedEventCandidates(input);
    assert.equal(result.candidates.length, 0);
    return result.skipped[0].reason;
  });
  assert.deepEqual(reasons, ["missing_persisted_evidence", "negated_or_unknown", "conditional", "attributed_actor_ambiguous"]);
});

test("a unique resolved mention inside evidence may be the subject but ambiguous mentions abstain", () => {
  const base = fixture({
    claims: [{ ...fixture().claims[0], subjectEntityId: null }],
    entities: [{ entityType: "organization", evidence: { start: 3, end: 7 } }],
    resolutions: [{ result: { entityId: 31 } }],
  });
  assert.equal(buildEvidenceBackedEventCandidates(base).candidates[0].entities[0].entityId, 31);
  const ambiguous = {
    ...base,
    entities: [...base.entities, { entityType: "person", evidence: { start: 8, end: 12 } }],
    resolutions: [...base.resolutions, { result: { entityId: 32 } }],
  };
  const result = buildEvidenceBackedEventCandidates(ambiguous);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.skipped[0].reason, "participant_unresolved");
});

test("publication time is never substituted for unknown event time", () => {
  const result = buildEvidenceBackedEventCandidates({ ...fixture(), publicationTime: "2026-10-19T10:00:00Z" });
  assert.equal(result.candidates[0].startAt, null);
  assert.equal(result.candidates[0].endAt, null);
});

test("rerun is deterministic while similar events from different articles never auto-merge", () => {
  const first = buildEvidenceBackedEventCandidates(fixture()).candidates[0];
  const retry = buildEvidenceBackedEventCandidates(fixture()).candidates[0];
  const other = buildEvidenceBackedEventCandidates(fixture({ articleId: 8 })).candidates[0];
  assert.equal(first.normalizedKey, retry.normalizedKey);
  assert.notEqual(first.normalizedKey, other.normalizedKey);
});

test("malformed claim/persistence alignment fails before any persistence", () => {
  assert.throws(() => buildEvidenceBackedEventCandidates(fixture({ persistedClaims: [] })), /event_claim_persistence_mismatch/);
});
