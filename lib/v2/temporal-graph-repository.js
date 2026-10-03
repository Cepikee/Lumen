"use strict";

const { OWNER_TYPES, ITEM_TYPES, VISIBILITIES, validateTimelineItem } = require("./temporal-graph");

function requireConnection(connection) { if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required"); }
function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function temporalSql(value) { return value == null ? null : new Date(value).toISOString().replace("T", " ").replace("Z", ""); }
function comparable(value) {
  if (value == null) return null;
  if (value instanceof Date) return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds())).toISOString();
  const text = String(value);
  const mysqlValue = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/);
  if (mysqlValue) return `${mysqlValue[1]}T${mysqlValue[2]}.${(mysqlValue[3] || "0").padEnd(3, "0").slice(0, 3)}Z`;
  return new Date(text).toISOString();
}

async function ensureTimeline(connection, ownerType, ownerId, visibility = "public") {
  if (!OWNER_TYPES.includes(ownerType)) throw new TypeError("owner_type_invalid");
  const owner = positiveId(ownerId, "owner_id");
  if (!VISIBILITIES.includes(visibility)) throw new TypeError("visibility_invalid");
  const [result] = await connection.execute(
    `INSERT INTO v2_timelines (owner_type,owner_id,visibility,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),updated_at=UTC_TIMESTAMP(6)`,
    [ownerType, owner, visibility],
  );
  return Number(result.insertId);
}

async function persistTimelineItem(connection, { ownerType, ownerId, item }) {
  requireConnection(connection);
  const valid = validateTimelineItem(item);
  if (valid.status !== "valid") throw new TypeError(valid.errors[0]);
  const timelineId = await ensureTimeline(connection, ownerType, ownerId, valid.result.visibility);
  const [existingRows] = await connection.execute(
    "SELECT valid_at validAt,valid_from validFrom,valid_until validUntil FROM v2_timeline_items WHERE timeline_id=? AND item_type=? AND item_id=? AND ordering_key=? LIMIT 1",
    [timelineId, valid.result.itemType, valid.result.itemId, valid.result.orderingKey],
  );
  if (existingRows.length) {
    const existing = existingRows[0];
    const sameTemporal = [existing.validAt, existing.validFrom, existing.validUntil].every((value, index) => comparable(value) === [valid.result.validAt, valid.result.validFrom, valid.result.validUntil][index]);
    if (!sameTemporal) throw new Error("timeline_item_temporal_conflict");
  }
  const [result] = await connection.execute(
    `INSERT INTO v2_timeline_items (timeline_id,item_type,item_id,valid_at,valid_from,valid_until,display_at,confidence,visibility,ordering_key,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE confidence=VALUES(confidence),display_at=VALUES(display_at),visibility=VALUES(visibility)`,
    [timelineId, valid.result.itemType, valid.result.itemId, temporalSql(valid.result.validAt), temporalSql(valid.result.validFrom), temporalSql(valid.result.validUntil), temporalSql(valid.result.displayAt), valid.result.confidence, valid.result.visibility, valid.result.orderingKey],
  );
  return { timelineId, itemId: Number(result.insertId), idempotent: Number(result.affectedRows) === 0 };
}

async function readTimelineItems(connection, { ownerType, ownerId, asOf, limit = 50, cursor = null, visibility = "public" }) {
  requireConnection(connection);
  if (!OWNER_TYPES.includes(ownerType)) throw new TypeError("owner_type_invalid");
  const owner = positiveId(ownerId, "owner_id");
  if (typeof asOf !== "string" || Number.isNaN(Date.parse(asOf))) throw new TypeError("as_of_invalid");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new TypeError("limit_invalid");
  if (!VISIBILITIES.includes(visibility)) throw new TypeError("visibility_invalid");
  const asOfSql = temporalSql(asOf);
  const params = [ownerType, owner, visibility, asOfSql, asOfSql, asOfSql];
  let cursorSql = "";
  if (cursor) { if (typeof cursor.orderingKey !== "string" || !Number.isSafeInteger(Number(cursor.id))) throw new TypeError("cursor_invalid"); cursorSql = " AND (i.ordering_key > ? OR (i.ordering_key = ? AND i.id > ?))"; params.push(cursor.orderingKey, cursor.orderingKey, Number(cursor.id)); }
  params.push(limit + 1);
  const [rows] = await connection.execute(
    `SELECT i.id,i.item_type itemType,i.item_id itemId,i.valid_at validAt,i.valid_from validFrom,i.valid_until validUntil,i.display_at displayAt,i.confidence,i.visibility,i.ordering_key orderingKey
     FROM v2_timeline_items i JOIN v2_timelines t ON t.id=i.timeline_id
     WHERE t.owner_type=? AND t.owner_id=? AND i.visibility=? AND (i.valid_at IS NULL OR i.valid_at <= ?)
       AND (i.valid_from IS NULL OR i.valid_from <= ?) AND (i.valid_until IS NULL OR i.valid_until > ?)
       ${cursorSql} ORDER BY i.ordering_key ASC,i.id ASC LIMIT ?`, params,
  );
  const hasMore = rows.length > limit; const page = rows.slice(0, limit);
  const nextCursor = hasMore ? { orderingKey: page[page.length - 1].orderingKey, id: Number(page[page.length - 1].id) } : null;
  return { items: page, nextCursor };
}

module.exports = { temporalSql, ensureTimeline, persistTimelineItem, readTimelineItems };
