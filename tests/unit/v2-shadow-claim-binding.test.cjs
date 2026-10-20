"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { bindResolvedClaimEntities } = require("../../lib/v2/shadow-claim-binding");

const evidence = { start: 0, end: 80, textSpan: "A BKK Zrt. a Zöld Busz Program keretében új buszokat vásárol." };
const claim = { predicate: "BUS_PURCHASE", subjectEntityId: null, objectEntityId: null, evidence };
const entities = [
  { entityType: "organization", evidence: { start: 2, end: 9 } },
  { entityType: "project", evidence: { start: 13, end: 30 } },
];
const resolutions = [
  { result: { entityId: 101, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } },
  { result: { entityId: 102, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } },
];

test("shadow claim binding resolves evidence-local BUS_PURCHASE roles", () => {
  const [bound] = bindResolvedClaimEntities({ claims: [claim], entities, resolutions });
  assert.equal(bound.subjectEntityId, 101);
  assert.equal(bound.objectEntityId, 102);
});

test("shadow claim binding abstains when either semantic role is ambiguous", () => {
  const [bound] = bindResolvedClaimEntities({
    claims: [claim],
    entities: [...entities, { entityType: "project", evidence: { start: 31, end: 45 } }],
    resolutions: [...resolutions, { result: { entityId: 103, resolutionStatus: "resolved_exact", entityStatus: "accepted", provisional: false } }],
  });
  assert.equal(bound.subjectEntityId, 101);
  assert.equal(bound.objectEntityId, null);
});

test("shadow claim binding never promotes provisional entity anchors", () => {
  const provisional = resolutions.map((item) => ({ result: { ...item.result, resolutionStatus: "unresolved", entityStatus: "unresolved", provisional: true } }));
  const [bound] = bindResolvedClaimEntities({ claims: [claim], entities, resolutions: provisional });
  assert.equal(bound.subjectEntityId, null);
  assert.equal(bound.objectEntityId, null);
});

test("shadow claim binding does not infer roles for unsupported predicates", () => {
  const original = { ...claim, predicate: "TEXT_ASSERTION" };
  assert.equal(bindResolvedClaimEntities({ claims: [original], entities, resolutions })[0], original);
});
