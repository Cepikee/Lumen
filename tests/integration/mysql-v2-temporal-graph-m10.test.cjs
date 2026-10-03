"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { persistTimelineItem, readTimelineItems } = require("../../lib/v2/temporal-graph-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }

test("M10 MySQL timeline persistence is idempotent, as-of bounded and cursor stable", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const suffix = Date.now();
    const first = await persistTimelineItem(connection, { ownerType: "entity", ownerId: suffix, item: { itemType: "event", itemId: suffix, validAt: "2026-01-01T00:00:00Z", validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-12-31T00:00:00Z", orderingKey: "2026-01-01/0001" } });
    const retry = await persistTimelineItem(connection, { ownerType: "entity", ownerId: suffix, item: { itemType: "event", itemId: suffix, validAt: "2026-01-01T00:00:00Z", validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-12-31T00:00:00Z", orderingKey: "2026-01-01/0001", confidence: 0.9 } });
    assert.equal(first.timelineId, retry.timelineId);
    await assert.rejects(() => persistTimelineItem(connection, { ownerType: "entity", ownerId: suffix, item: { itemType: "event", itemId: suffix, validAt: "2026-01-02T00:00:00Z", validFrom: "2026-01-02T00:00:00Z", validUntil: "2026-12-31T00:00:00Z", orderingKey: "2026-01-01/0001" } }), /timeline_item_temporal_conflict/);
    const future = await persistTimelineItem(connection, { ownerType: "entity", ownerId: suffix, item: { itemType: "article", itemId: suffix, validAt: "2027-01-01T00:00:00Z", orderingKey: "2027-01-01/0001" } });
    assert.equal(future.timelineId, first.timelineId);
    const page = await readTimelineItems(connection, { ownerType: "entity", ownerId: suffix, asOf: "2026-06-01T00:00:00Z", limit: 1 });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].itemId, suffix);
    assert.equal(page.nextCursor, null);
    const [[counts]] = await connection.execute("SELECT COUNT(*) count FROM v2_timeline_items WHERE timeline_id=?", [first.timelineId]);
    assert.equal(Number(counts.count), 2);
  } finally { await connection.end(); }
});

test("M10 MySQL caller rollback removes timeline writes", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const suffix = Date.now() + 1;
    await connection.beginTransaction();
    await persistTimelineItem(connection, { ownerType: "event", ownerId: suffix, item: { itemType: "claim", itemId: suffix, validAt: "2026-01-01T00:00:00Z", orderingKey: "2026-01-01/rollback" } });
    await connection.rollback();
    const [[counts]] = await connection.execute("SELECT COUNT(*) count FROM v2_timelines WHERE owner_type=? AND owner_id=?", ["event", suffix]);
    assert.equal(Number(counts.count), 0);
  } finally { await connection.end(); }
});

test("M10 MySQL concurrent workers keep one timeline identity and item", { skip: !enabled }, async () => {
  const first = await connect(); const second = await connect();
  try {
    await applyMigrations(first, loadMigrations());
    const suffix = Date.now() + 2;
    const item = { itemType: "relation", itemId: suffix, validAt: "2026-01-01T00:00:00Z", orderingKey: "2026-01-01/concurrent" };
    const results = await Promise.allSettled([
      persistTimelineItem(first, { ownerType: "topic", ownerId: suffix, item }),
      persistTimelineItem(second, { ownerType: "topic", ownerId: suffix, item }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
    const [[timelines]] = await first.execute("SELECT COUNT(*) count FROM v2_timelines WHERE owner_type=? AND owner_id=?", ["topic", suffix]);
    const [[items]] = await first.execute("SELECT COUNT(*) count FROM v2_timeline_items i JOIN v2_timelines t ON t.id=i.timeline_id WHERE t.owner_type=? AND t.owner_id=?", ["topic", suffix]);
    assert.deepEqual([Number(timelines.count), Number(items.count)], [1, 1]);
  } finally { await first.end(); await second.end(); }
});

console.log("M10 MySQL temporal graph regression: PASS");
