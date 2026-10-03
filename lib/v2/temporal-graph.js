"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const OWNER_TYPES = Object.freeze(["entity", "event", "topic"]);
const ITEM_TYPES = Object.freeze(["event", "article", "claim", "relation"]);
const VISIBILITIES = Object.freeze(["public", "premium", "internal"]);
const ITEM_STATUSES = Object.freeze(["observed", "active", "candidate", "completed", "disputed", "review", "unresolved", "superseded", "retracted", "expired", "archived"]);
const ACTIVE_STATUSES = new Set(["observed", "active", "candidate", "completed", "disputed", "review", "unresolved"]);
const SUPERSEDED_STATUSES = new Set(["superseded", "retracted", "expired", "archived"]);

function invalid(errors) { return { status: "invalid", errors: Object.freeze([...new Set(errors)]) }; }
function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function isoDate(value, field) {
  if (value == null) return null;
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) throw new TypeError(`${field}_invalid`);
  return new Date(value).toISOString();
}
function asOf(value = new Date().toISOString()) { return isoDate(value, "as_of"); }

function validateTemporalInterval(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["interval_invalid"]);
  const errors = [];
  let validFrom = null; let validUntil = null;
  try { validFrom = isoDate(input.validFrom, "valid_from"); } catch (error) { errors.push(error.message); }
  try { validUntil = isoDate(input.validUntil, "valid_until"); } catch (error) { errors.push(error.message); }
  if (validFrom && validUntil && Date.parse(validFrom) >= Date.parse(validUntil)) errors.push("valid_interval_invalid");
  return errors.length ? invalid(errors) : { status: "valid", result: Object.freeze({ validFrom, validUntil }) };
}

function validateTimelineItem(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["item_invalid"]);
  const errors = [];
  if (!ITEM_TYPES.includes(input.itemType)) errors.push("item_type_invalid");
  try { positiveId(input.itemId, "item_id"); } catch (error) { errors.push(error.message); }
  if (typeof input.orderingKey !== "string" || !input.orderingKey.trim() || input.orderingKey.length > 128) errors.push("ordering_key_invalid");
  if (input.visibility != null && !VISIBILITIES.includes(input.visibility)) errors.push("visibility_invalid");
  if (input.status != null && !ITEM_STATUSES.includes(input.status)) errors.push("status_invalid");
  if (input.confidence != null && (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1)) errors.push("confidence_invalid");
  let validAt = null; let displayAt = null;
  try { validAt = isoDate(input.validAt, "valid_at"); } catch (error) { errors.push(error.message); }
  try { displayAt = isoDate(input.displayAt, "display_at"); } catch (error) { errors.push(error.message); }
  let validFrom = null; let validUntil = null;
  try { validFrom = isoDate(input.validFrom, "valid_from"); } catch (error) { errors.push(error.message); }
  try { validUntil = isoDate(input.validUntil, "valid_until"); } catch (error) { errors.push(error.message); }
  if (validFrom && validUntil && Date.parse(validFrom) >= Date.parse(validUntil)) errors.push("valid_interval_invalid");
  return errors.length ? invalid(errors) : Object.freeze({ status: "valid", result: Object.freeze({
    itemType: input.itemType, itemId: positiveId(input.itemId, "item_id"), validAt, displayAt,
    confidence: input.confidence == null ? null : input.confidence, visibility: input.visibility || "public", orderingKey: input.orderingKey.trim(),
    status: input.status || "observed", validFrom, validUntil,
  }) });
}

function isAsOfVisible(item, point) {
  const time = Date.parse(point);
  if (item.validAt && Date.parse(item.validAt) > time) return false;
  if (item.validFrom && Date.parse(item.validFrom) > time) return false;
  if (item.validUntil && Date.parse(item.validUntil) <= time) return false;
  return true;
}

function projectAsOf(items, point, options = {}) {
  const asOfAt = asOf(point);
  if (!Array.isArray(items)) throw new TypeError("items_must_be_array");
  const includeUnknownTime = options.includeUnknownTime !== false;
  const visible = items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (!ACTIVE_STATUSES.has(item.status || "observed")) return false;
    if (SUPERSEDED_STATUSES.has(item.status)) return false;
    if (!includeUnknownTime && !item.validAt && !item.validFrom) return false;
    return isAsOfVisible(item, asOfAt);
  });
  return Object.freeze([...visible].sort((left, right) => String(left.orderingKey).localeCompare(String(right.orderingKey)) || Number(left.itemId) - Number(right.itemId)));
}

function validateTemporalProjection(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["projection_invalid"]);
  const errors = [];
  if (!OWNER_TYPES.includes(input.ownerType)) errors.push("owner_type_invalid");
  try { positiveId(input.ownerId, "owner_id"); } catch (error) { errors.push(error.message); }
  let point;
  try { point = asOf(input.asOf); } catch (error) { errors.push(error.message); }
  if (!Array.isArray(input.items)) errors.push("items_must_be_array");
  const items = [];
  if (Array.isArray(input.items)) input.items.forEach((item, index) => {
    const valid = validateTimelineItem(item);
    if (valid.status !== "valid") valid.errors.forEach((error) => errors.push(`items[${index}].${error}`));
    else items.push(valid.result);
  });
  return errors.length ? invalid(errors) : Object.freeze({ status: "valid", result: Object.freeze({ contractVersion: CONTRACT_VERSIONS.temporalGraph, ownerType: input.ownerType, ownerId: positiveId(input.ownerId, "owner_id"), asOf: point, items: Object.freeze(items) }) });
}

module.exports = { OWNER_TYPES, ITEM_TYPES, VISIBILITIES, validateTemporalInterval, validateTimelineItem, validateTemporalProjection, projectAsOf, isAsOfVisible };
