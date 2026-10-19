"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateTemporalInterval, validateTimelineItem, validateTemporalProjection, projectAsOf } = require("../../lib/v2/temporal-graph");
const { runTemporalProjection } = require("../../lib/v2/runtime-temporal-graph");
const { temporalSql, persistTimelineItem, readTimelineItems, readArticleTimelineItems } = require("../../lib/v2/temporal-graph-repository");

const base = { itemType: "event", itemId: 2, validAt: "2026-01-02T00:00:00Z", orderingKey: "2026-01-02T00:00:00.000Z/000002" };

test("M10 validates UTC intervals and rejects inverted or equal bounds", () => {
  assert.equal(validateTemporalInterval({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-01-02T00:00:00Z" }).status, "valid");
  assert.equal(validateTemporalInterval({ validFrom: "2026-01-02T00:00:00Z", validUntil: "2026-01-02T00:00:00Z" }).status, "invalid");
  assert.equal(validateTemporalInterval({ validFrom: "bad" }).status, "invalid");
  assert.equal(validateTimelineItem({ ...base, confidence: Infinity }).status, "invalid");
  assert.equal(validateTimelineItem({ ...base, status: "winner" }).status, "invalid");
});

test("M10 reconstructs as-of state with exclusive upper bound and future exclusion", () => {
  const items = [
    { ...base, itemId: 1, validAt: "2025-12-31T23:59:59Z", status: "observed" },
    { ...base, itemId: 2, validAt: "2026-01-02T00:00:00Z", status: "observed" },
    { ...base, itemId: 3, validAt: "2026-01-03T00:00:00Z", status: "observed" },
    { ...base, itemId: 4, validAt: "2025-12-01T00:00:00Z", validUntil: "2026-01-02T00:00:00Z", status: "observed" },
    { ...base, itemId: 5, validAt: "2025-12-01T00:00:00Z", status: "superseded" },
  ];
  assert.deepEqual(projectAsOf(items, "2026-01-02T00:00:00Z").map((item) => item.itemId), [1, 2]);
});

test("M10 keeps unknown-time items explicit and orders deterministically", () => {
  const items = [
    { ...base, itemId: 9, validAt: null, orderingKey: "z" },
    { ...base, itemId: 8, validAt: null, orderingKey: "a" },
  ];
  assert.deepEqual(projectAsOf(items, "2026-01-02T00:00:00Z").map((item) => item.itemId), [8, 9]);
  assert.deepEqual(projectAsOf(items, "2026-01-02T00:00:00Z", { includeUnknownTime: false }), []);
});

test("M10 validates projection contract and feature OFF is side-effect free", () => {
  const valid = validateTemporalProjection({ ownerType: "entity", ownerId: 3, asOf: "2026-01-02T00:00:00Z", items: [base] });
  assert.equal(valid.status, "valid");
  assert.equal(validateTemporalProjection({ ownerType: "entity", ownerId: 3, asOf: "2026-01-02T00:00:00Z", items: [{ ...base, validFrom: "2026-01-03T00:00:00Z", validUntil: "2026-01-02T00:00:00Z" }] }).status, "invalid");
  const off = runTemporalProjection({ ownerType: "entity", ownerId: 3, asOf: "2026-01-02T00:00:00Z", items: [base] }, { enabled: false });
  assert.deepEqual([off.status, off.reads, off.writes, off.providerCalls], ["disabled", 0, 0, 0]);
  const on = runTemporalProjection({ ownerType: "entity", ownerId: 3, asOf: "2026-01-02T00:00:00Z", items: [base] }, { enabled: true });
  assert.equal(on.status, "completed");
  assert.equal(on.projection.contractVersion, "v2.temporal-graph.1");
});

test("M10 repository remains caller-transactional and uses stable cursor SQL", async () => {
  const calls = [];
  const connection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (/SELECT i\.id|SELECT valid_at/.test(sql)) return [[], []];
    if (/v2_timelines/.test(sql)) return [{ insertId: 12, affectedRows: 1 }];
    if (/v2_timeline_items/.test(sql)) return [{ insertId: 13, affectedRows: 1 }];
    throw new Error("unexpected_sql");
  } };
  const persisted = await persistTimelineItem(connection, { ownerType: "entity", ownerId: 3, item: base });
  assert.equal(persisted.timelineId, 12);
  assert.equal(temporalSql("2026-01-02T00:00:00Z"), "2026-01-02 00:00:00.000");
  await readTimelineItems(connection, { ownerType: "entity", ownerId: 3, asOf: "2026-01-02T00:00:00Z", limit: 10, cursor: { orderingKey: "a", id: 1 } });
  assert.match(calls.at(-1).sql, /valid_from IS NULL OR i\.valid_from <= \?/);
  assert.match(calls.at(-1).sql, /ordering_key > \? OR \(i\.ordering_key = \? AND i\.id > \?\)/);
  assert.equal(calls.some((call) => /COMMIT|ROLLBACK|START TRANSACTION/.test(call.sql)), false);
});

test("article-local timeline read returns a safe empty result and hides no-data as success", async () => {
  const connection = { execute: async () => [[], []] };
  const result = await readArticleTimelineItems(connection, { articleId: 7, asOf: "2026-10-19T00:00:00Z", limit: 10 });
  assert.deepEqual(result, { items: [], nextCursor: null });
});

test("article-local timeline read exposes event provenance and preserved precision", async () => {
  let call = 0;
  const connection = { execute: async () => {
    call += 1;
    if (call === 1) return [[{ id: 5, eventId: 61, validAt: null, validFrom: "2024-01-01 00:00:00", validUntil: "2025-01-01 00:00:00", displayAt: null, confidence: "0.9000", visibility: "public", orderingKey: "0-known/2024-01-01T00:00:00.000Z/3/00000000000000000061", eventType: "bus_purchase", label: "Buszvásárlás", status: "candidate", articleId: 7, evidenceId: 51 }], []];
    return [[{ eventId: 61, entityId: 31, role: "subject", confidence: "0.9000", evidenceId: 51 }], []];
  } };
  const result = await readArticleTimelineItems(connection, { articleId: 7, asOf: "2026-10-19T00:00:00Z", limit: 10 });
  assert.equal(result.items[0].timePrecision, "year");
  assert.deepEqual(result.items[0].evidence, { articleId: 7, evidenceId: 51 });
  assert.deepEqual(result.items[0].participants[0], { entityId: 31, role: "subject", confidence: 0.9, evidenceId: 51 });
});

console.log("M10 temporal graph regression: PASS");
