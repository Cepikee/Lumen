"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildArticleTimelineProjection, temporalScope } = require("../../lib/v2/shadow-timeline-projection");

function candidate(overrides = {}) {
  return { eventType: "bus_purchase", status: "candidate", startAt: null, endAt: null, confidence: 0.9, articleId: 7, evidenceId: 51, modality: "asserted", ...overrides };
}
function persisted(eventId = 61, overrides = {}) { return { eventId, articleId: 7, ...overrides }; }
function project(candidates, events = candidates.map((_, index) => persisted(61 + index))) {
  return buildArticleTimelineProjection({ articleId: 7, eventCandidates: candidates, persistedEvents: events });
}

test("exact dates and timestamps remain exact article-local event projections", () => {
  const result = project([candidate({ startAt: "2026-10-19" }), candidate({ startAt: "2026-10-19T14:30:00+02:00" })]);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map((item) => item.timePrecision), ["date", "timestamp"]);
  assert.equal(result.items[0].ownerType, "article");
  assert.equal(result.items[0].item.validAt, "2026-10-19T00:00:00.000Z");
  assert.equal(result.items[1].item.validAt, "2026-10-19T12:30:00.000Z");
});

test("year and month precision use bounded intervals rather than invented event days", () => {
  const year = temporalScope(candidate({ startAt: "2024" }));
  const month = temporalScope(candidate({ startAt: "2026-10" }));
  assert.deepEqual(year, { precision: "year", validAt: null, validFrom: "2024-01-01T00:00:00.000Z", validUntil: "2025-01-01T00:00:00.000Z" });
  assert.deepEqual(month, { precision: "month", validAt: null, validFrom: "2026-10-01T00:00:00.000Z", validUntil: "2026-11-01T00:00:00.000Z" });
});

test("unknown time is retained without publication-time fallback", () => {
  const result = project([candidate()]);
  assert.equal(result.unknownTime, 1);
  assert.equal(result.items[0].timePrecision, "unknown");
  assert.equal(result.items[0].item.validAt, null);
  assert.equal(result.items[0].item.validFrom, null);
  assert.match(result.items[0].item.orderingKey, /^9-unknown\//);
});

test("an explicit historical year wins over an unrelated article publication year", () => {
  const result = buildArticleTimelineProjection({ articleId: 7, publicationTime: "2026-10-19T00:00:00Z", eventCandidates: [candidate({ startAt: "1997" })], persistedEvents: [persisted()] });
  assert.equal(result.items[0].timePrecision, "year");
  assert.equal(result.items[0].item.validFrom, "1997-01-01T00:00:00.000Z");
});

test("explicit ranges remain ranges", () => {
  const result = project([candidate({ startAt: "2025-01", endAt: "2025-03" })]);
  assert.equal(result.items[0].timePrecision, "range");
  assert.equal(result.items[0].item.validFrom, "2025-01-01T00:00:00.000Z");
  assert.equal(result.items[0].item.validUntil, "2025-04-01T00:00:00.000Z");
  assert.equal(result.items[0].item.validAt, null);
});

test("planned events abstain from historical timeline projection", () => {
  const result = project([candidate({ startAt: "2027-11-03", modality: "planned" })]);
  assert.equal(result.items.length, 0);
  assert.equal(result.skipped[0].reason, "planned_event");
});

test("missing evidence or mismatched persisted membership cannot create a timeline item", () => {
  const result = project([candidate({ evidenceId: null }), candidate()], [persisted(61), persisted(62, { articleId: 8 })]);
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.skipped.map((item) => item.reason), ["missing_event_evidence", "persisted_event_mismatch"]);
});

test("same-time events have stable technical ordering without a causal edge", () => {
  const result = project([candidate({ startAt: "2026-10-19" }), candidate({ startAt: "2026-10-19" })], [persisted(72), persisted(61)]);
  assert.deepEqual(result.items.map((item) => item.item.itemId), [61, 72]);
  assert.equal(result.items.some((item) => Object.hasOwn(item, "cause") || Object.hasOwn(item, "consequence")), false);
});

test("conflicting times for the same persisted event abstain without choosing a winner", () => {
  const result = project([candidate({ startAt: "2026" }), candidate({ startAt: "2027" })], [persisted(61), persisted(61)]);
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.skipped.map((item) => item.reason), ["temporal_conflict", "temporal_conflict"]);
});

test("relative or malformed temporal values do not become absolute timeline dates", () => {
  const result = project([candidate({ startAt: "tegnap" })]);
  assert.equal(result.items.length, 0);
  assert.equal(result.skipped[0].reason, "temporal_scope_invalid");
});

console.log("V2 shadow timeline projection regression: PASS");
