"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyEventMatch, normalizeEventKey, validateEventCandidate } = require("../../lib/v2/event-matching");
const { mysqlUtc, persistEventCandidate } = require("../../lib/v2/event-matching-repository");
const { runEventMatching } = require("../../lib/v2/runtime-event-matching");

const input = { eventType: "acquisition", canonicalTitle: "Acme megvásárolta a Beta céget", articleId: 11, startAt: "2026-10-01T00:00:00Z", confidence: 0.91, entities: [{ entityId: 3, role: "buyer", confidence: 0.95 }] };

test("M9 creates deterministic review-only event candidates", () => {
  const first = validateEventCandidate(input);
  const second = validateEventCandidate({ ...input, canonicalTitle: " Acme megvásárolta a Beta céget " });
  assert.equal(first.status, "valid");
  assert.equal(first.result.status, "candidate");
  assert.equal(first.result.normalizedKey, second.result.normalizedKey);
  assert.equal(normalizeEventKey("acquisition", input.canonicalTitle, input.startAt), first.result.normalizedKey);
  assert.equal(mysqlUtc(input.startAt), "2026-10-01 00:00:00.000");
});

test("M9 rejects invalid intervals, confidence and unknown membership", () => {
  assert.equal(validateEventCandidate({ ...input, endAt: "2026-09-01T00:00:00Z" }).status, "invalid");
  assert.equal(validateEventCandidate({ ...input, confidence: 2 }).status, "invalid");
  assert.equal(validateEventCandidate({ ...input, membershipType: "merged" }).status, "invalid");
  assert.equal(validateEventCandidate({ ...input, status: "unknown" }).status, "invalid");
  assert.equal(validateEventCandidate({ ...input, entities: [{ entityId: 3, role: "buyer", validFrom: "2026-10-02T00:00:00Z", validUntil: "2026-10-01T00:00:00Z" }] }).status, "invalid");
  assert.equal(validateEventCandidate({ ...input, entities: [{ entityId: 3, role: "buyer", validFrom: "not-a-date" }] }).status, "invalid");
});

test("M9 classifies touching and unknown intervals conservatively for review", () => {
  const first = validateEventCandidate({ ...input, endAt: "2026-10-02T00:00:00Z" }).result;
  const touching = validateEventCandidate({ ...input, articleId: 12, canonicalTitle: "Touching event", startAt: "2026-10-02T00:00:00Z", entities: [{ entityId: 3, role: "buyer" }] }).result;
  const unknown = validateEventCandidate({ ...input, articleId: 13, canonicalTitle: "Unknown time event", startAt: null, entities: [{ entityId: 3, role: "buyer" }] }).result;
  assert.equal(classifyEventMatch(first, touching).status, "review_merge");
  assert.equal(classifyEventMatch(first, touching).reason, "shared_entity_temporal_overlap");
  assert.equal(classifyEventMatch(first, unknown).status, "review_merge");
  assert.equal(classifyEventMatch(first, unknown).reason, "temporal_unknown");
});

test("M9 keeps merge authority review-only and separates disjoint temporal candidates", () => {
  const first = validateEventCandidate(input).result;
  const overlap = validateEventCandidate({ ...input, articleId: 12, canonicalTitle: "Másik beszámoló", endAt: "2026-10-02T00:00:00Z" }).result;
  const disjoint = validateEventCandidate({ ...input, articleId: 13, canonicalTitle: "Későbbi esemény", startAt: "2026-11-01T00:00:00Z" }).result;
  assert.equal(classifyEventMatch(first, overlap).status, "review_merge");
  assert.equal(classifyEventMatch(first, overlap).reason, "shared_entity_temporal_overlap");
  assert.equal(classifyEventMatch(first, disjoint).status, "separate");
  assert.equal(classifyEventMatch(first, disjoint).reason, "temporal_disjoint");
  assert.equal(classifyEventMatch(first, disjoint).review, "split");
  assert.equal(classifyEventMatch(first, disjoint).mutation, "none");
});

test("M9 event repository writes event, article membership and entity memberships without owning a transaction", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/v2_events/.test(sql)) return [{ insertId: 20, affectedRows: 1 }];
    if (/v2_event_articles/.test(sql)) return [{ insertId: 21, affectedRows: 1 }];
    if (/GET_LOCK/.test(sql)) return [[{ acquired: 1 }]];
    if (/RELEASE_LOCK/.test(sql)) return [[{ released: 1 }]];
    if (/v2_event_entities/.test(sql)) return [{ insertId: 22, affectedRows: 1 }];
    throw new Error("unexpected_sql");
  } };
  const candidate = validateEventCandidate(input).result;
  const result = await persistEventCandidate(connection, candidate);
  assert.deepEqual(result, { eventId: 20, articleId: 11, entityCount: 1, status: "candidate", merged: false });
  assert.equal(calls.length, 5);
  assert.equal(calls.some((call) => /START TRANSACTION|COMMIT|ROLLBACK/.test(call.sql)), false);
  assert.match(calls.find((call) => /v2_event_articles/.test(call.sql)).sql, /COALESCE\(evidence_id,VALUES\(evidence_id\)\)/);
  assert.match(calls.find((call) => /UPDATE v2_event_entities/.test(call.sql)).sql, /COALESCE\(evidence_id,\?\)/);
});

test("M9 feature OFF is inert and ON returns a review-only candidate without AI", () => {
  const off = runEventMatching(input, { enabled: false });
  assert.deepEqual([off.status, off.providerCalls, off.reads, off.writes], ["disabled", 0, 0, 0]);
  const on = runEventMatching(input, { enabled: true });
  assert.equal(on.status, "candidate");
  assert.equal(on.candidate.status, "candidate");
  assert.equal(on.providerCalls, 0);
});

console.log("M9 event matching first-slice regression: PASS");
