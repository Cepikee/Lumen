"use strict";

const { createHash } = require("node:crypto");

const EVENT_STATUSES = Object.freeze(["candidate", "active", "completed", "disputed", "merged"]);
const MEMBERSHIP_TYPES = Object.freeze(["primary", "coverage", "related"]);
const MEMBERSHIP_SET = new Set(MEMBERSHIP_TYPES);

function invalid(errors) { return { status: "invalid", errors: Object.freeze([...new Set(errors)]) }; }
function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function confidence(value, field = "confidence") { if (value == null) return null; if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new TypeError(`${field}_invalid`); return value; }
function date(value, field) { if (value == null) return null; if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) throw new TypeError(`${field}_invalid`); return value; }
function normalizeEventKey(eventType, title, startAt = null) {
  const type = String(eventType || "").normalize("NFC").trim().toLocaleLowerCase("hu-HU");
  const text = String(title || "").normalize("NFC").trim().toLocaleLowerCase("hu-HU").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ");
  const temporal = startAt ? new Date(startAt).toISOString() : "unknown";
  const payload = `${type}|${text}|${temporal}`;
  return createHash("sha256").update(payload).digest("hex");
}

function intervalRelation(left, right) {
  const leftStart = left.startAt ? Date.parse(left.startAt) : null;
  const leftEnd = left.endAt ? Date.parse(left.endAt) : leftStart;
  const rightStart = right.startAt ? Date.parse(right.startAt) : null;
  const rightEnd = right.endAt ? Date.parse(right.endAt) : rightStart;
  if (leftStart == null || rightStart == null) return "unknown";
  return leftStart <= rightEnd && rightStart <= leftEnd ? "overlap" : "disjoint";
}

function classifyEventMatch(left, right) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return { status: "invalid", reason: "candidate_required" };
  if (left.normalizedKey && left.normalizedKey === right.normalizedKey) return { status: "same_candidate", reason: "normalized_key", mutation: "none" };
  if (left.eventType !== right.eventType) return { status: "separate", reason: "event_type", mutation: "none" };
  const leftEntities = new Set((left.entities || []).map((entity) => Number(entity.entityId)));
  const sharedEntities = (right.entities || []).map((entity) => Number(entity.entityId)).filter((id) => leftEntities.has(id));
  if (!sharedEntities.length) return { status: "separate", reason: "no_shared_entity", mutation: "none" };
  const temporal = intervalRelation(left, right);
  const entities = [...new Set(sharedEntities)];
  if (temporal === "disjoint") return { status: "separate", reason: "temporal_disjoint", sharedEntities: entities, review: "split", mutation: "none" };
  return { status: "review_merge", reason: temporal === "unknown" ? "temporal_unknown" : "shared_entity_temporal_overlap", sharedEntities: entities, review: "merge", mutation: "none" };
}

function validateEventCandidate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["input_invalid"]);
  const errors = [];
  if (typeof input.eventType !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(input.eventType)) errors.push("event_type_invalid");
  if (typeof input.canonicalTitle !== "string" || !input.canonicalTitle.trim() || input.canonicalTitle.length > 512) errors.push("canonical_title_invalid");
  try { positiveId(input.articleId, "article_id"); } catch (error) { errors.push(error.message); }
  let startAt = null; let endAt = null;
  try { startAt = date(input.startAt, "start_at"); } catch (error) { errors.push(error.message); }
  try { endAt = date(input.endAt, "end_at"); } catch (error) { errors.push(error.message); }
  if (startAt && endAt && Date.parse(startAt) > Date.parse(endAt)) errors.push("event_interval_invalid");
  try { confidence(input.confidence); } catch (error) { errors.push(error.message); }
  if (input.status != null && !EVENT_STATUSES.includes(input.status)) errors.push("status_invalid");
  const entities = Array.isArray(input.entities) ? input.entities : [];
  entities.forEach((entity, index) => {
    try { positiveId(entity.entityId, `entities[${index}].entity_id`); } catch (error) { errors.push(error.message); }
    if (typeof entity.role !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(entity.role)) errors.push(`entities[${index}].role_invalid`);
    try { confidence(entity.confidence, `entities[${index}].confidence`); } catch (error) { errors.push(error.message); }
    try { date(entity.validFrom, `entities[${index}].valid_from`); } catch (error) { errors.push(error.message); }
    try { date(entity.validUntil, `entities[${index}].valid_until`); } catch (error) { errors.push(error.message); }
    if (entity.validFrom && entity.validUntil && Date.parse(entity.validFrom) > Date.parse(entity.validUntil)) errors.push(`entities[${index}].interval_invalid`);
  });
  const membershipType = input.membershipType || "primary";
  if (!MEMBERSHIP_SET.has(membershipType)) errors.push("membership_type_invalid");
  if (errors.length) return invalid(errors);
  return Object.freeze({ status: "valid", result: Object.freeze({
    eventType: input.eventType,
    canonicalTitle: input.canonicalTitle.trim(),
    normalizedKey: input.normalizedKey || normalizeEventKey(input.eventType, input.canonicalTitle, startAt),
    status: input.status || "candidate",
    startAt, endAt, confidence: input.confidence == null ? null : input.confidence,
    articleId: positiveId(input.articleId, "article_id"),
    membershipType,
    entities: Object.freeze(entities.map((entity) => Object.freeze({ entityId: positiveId(entity.entityId, "entity_id"), role: entity.role, confidence: entity.confidence == null ? null : entity.confidence, validFrom: entity.validFrom || null, validUntil: entity.validUntil || null, evidenceId: entity.evidenceId == null ? null : positiveId(entity.evidenceId, "evidence_id") }))),
    evidenceId: input.evidenceId == null ? null : positiveId(input.evidenceId, "evidence_id"),
  }) });
}

module.exports = { EVENT_STATUSES, MEMBERSHIP_TYPES, normalizeEventKey, intervalRelation, classifyEventMatch, validateEventCandidate };
