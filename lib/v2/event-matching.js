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

const DISCRIMINATING_ROLES = new Set(["object", "target", "project", "product"]);
const LOCATION_ROLES = new Set(["location", "place"]);
const SUBJECT_ROLES = new Set(["subject", "actor", "agent"]);
const RESOLVED_ENTITY_STATUSES = new Set(["active", "accepted", "review", "disputed"]);

function canonicalId(entity) {
  const value = entity?.canonicalEntityId ?? entity?.entityId;
  return /^[1-9][0-9]*$/.test(String(value)) ? Number(value) : null;
}

function idsForRoles(event, roles) {
  return [...new Set((event?.entities || [])
    .filter((entity) => roles.has(String(entity?.role || "").toLowerCase()) && RESOLVED_ENTITY_STATUSES.has(String(entity?.status || "").toLowerCase()))
    .map(canonicalId).filter(Boolean))].sort((a, b) => a - b);
}

function sameIds(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasEvidence(event) {
  return Array.isArray(event?.evidence) && event.evidence.some((item) =>
    /^[1-9][0-9]*$/.test(String(item?.evidenceId)) &&
    /^[1-9][0-9]*$/.test(String(item?.articleId)) &&
    /^[1-9][0-9]*$/.test(String(item?.sourceId)));
}

function semanticStatus(event) {
  return {
    status: String(event?.semanticStatus || event?.claimStatus || event?.status || "").toLowerCase(),
    modality: event?.modality == null ? null : String(event.modality).toLowerCase(),
    conditional: event?.conditional === true,
    uncertainty: event?.uncertainty === true,
    polarity: event?.polarity == null ? null : String(event.polarity).toLowerCase(),
  };
}

function exactTemporal(event) {
  if (!event?.startAt) return null;
  const start = Date.parse(event.startAt);
  const end = event.endAt == null ? start : Date.parse(event.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null;
  return [new Date(start).toISOString(), new Date(end).toISOString()];
}

/**
 * Conservative, read-only cross-article identity decision. Titles, keywords,
 * categories and publication timestamps deliberately never participate.
 */
function classifyCrossArticleEventMatch(left, right) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return { status: "invalid", reason: "event_required", mutation: "none" };
  if (!hasEvidence(left) || !hasEvidence(right)) return { status: "insufficient_evidence", reason: "evidence_missing", mutation: "none" };
  if (String(left.eventType || "") !== String(right.eventType || "")) return { status: "rejected", reason: "event_type", mutation: "none" };
  const leftArticleIds = new Set((left.evidence || []).map((item) => Number(item.articleId)).filter(Number.isSafeInteger));
  if ((right.evidence || []).some((item) => leftArticleIds.has(Number(item.articleId)))) return { status: "rejected", reason: "same_article_distinct_event", mutation: "none" };

  const leftSubjects = idsForRoles(left, SUBJECT_ROLES); const rightSubjects = idsForRoles(right, SUBJECT_ROLES);
  if (!leftSubjects.length || !rightSubjects.length) return { status: "abstain", reason: "subject_unresolved", mutation: "none" };
  if (!sameIds(leftSubjects, rightSubjects)) return { status: "rejected", reason: "subject_mismatch", mutation: "none" };

  const leftObjects = idsForRoles(left, DISCRIMINATING_ROLES); const rightObjects = idsForRoles(right, DISCRIMINATING_ROLES);
  if (leftObjects.length && rightObjects.length && !sameIds(leftObjects, rightObjects)) return { status: "rejected", reason: "object_mismatch", mutation: "none" };
  if (!leftObjects.length || !rightObjects.length) return { status: "candidate", reason: "object_not_proven", mutation: "none" };

  const leftLocations = idsForRoles(left, LOCATION_ROLES); const rightLocations = idsForRoles(right, LOCATION_ROLES);
  if (leftLocations.length && rightLocations.length && !sameIds(leftLocations, rightLocations)) return { status: "rejected", reason: "location_mismatch", mutation: "none" };
  if (leftLocations.length !== rightLocations.length) return { status: "candidate", reason: "location_not_proven", mutation: "none" };

  const leftTime = exactTemporal(left); const rightTime = exactTemporal(right);
  if (!leftTime || !rightTime) return { status: "candidate", reason: "temporal_unknown", mutation: "none" };
  if (!sameIds(leftTime, rightTime)) return { status: "rejected", reason: "temporal_mismatch", mutation: "none" };

  const leftState = semanticStatus(left); const rightState = semanticStatus(right);
  if (JSON.stringify(leftState) !== JSON.stringify(rightState)) return { status: "rejected", reason: "event_state_mismatch", mutation: "none" };
  if (left.predicate && right.predicate && String(left.predicate) !== String(right.predicate)) return { status: "rejected", reason: "predicate_mismatch", mutation: "none" };
  return { status: "matched", reason: "structured_identity", mutation: "none", sharedSubjects: leftSubjects, sharedObjects: leftObjects, sharedLocations: leftLocations };
}

function buildCrossArticleEventGroup(events, anchorEventId = null) {
  if (!Array.isArray(events)) throw new TypeError("events_must_be_array");
  const ordered = [...events].filter((event) => /^[1-9][0-9]*$/.test(String(event?.eventId))).sort((a, b) => Number(a.eventId) - Number(b.eventId));
  const anchor = anchorEventId == null ? ordered[0] : ordered.find((event) => Number(event.eventId) === Number(anchorEventId));
  if (!anchor) throw new TypeError("anchor_event_invalid");
  const matched = [Number(anchor.eventId)]; const candidates = []; const rejected = []; const abstained = [];
  let crossSourceMatches = 0; let sameSourceMatches = 0;
  const anchorSources = new Set((anchor.evidence || []).map((item) => Number(item.sourceId)).filter(Number.isSafeInteger));
  for (const event of ordered) {
    if (Number(event.eventId) === Number(anchor.eventId)) continue;
    const decision = classifyCrossArticleEventMatch(anchor, event);
    const entry = { eventId: Number(event.eventId), status: decision.status, reason: decision.reason };
    if (decision.status === "matched") {
      matched.push(entry.eventId);
      const sources = new Set((event.evidence || []).map((item) => Number(item.sourceId)).filter(Number.isSafeInteger));
      if ([...sources].some((sourceId) => !anchorSources.has(sourceId))) crossSourceMatches += 1; else sameSourceMatches += 1;
    } else if (decision.status === "candidate") candidates.push(entry);
    else if (decision.status === "rejected") rejected.push(entry);
    else abstained.push(entry);
  }
  matched.sort((a, b) => a - b);
  const sourceIds = [...new Set(ordered.filter((event) => matched.includes(Number(event.eventId))).flatMap((event) => (event.evidence || []).map((item) => Number(item.sourceId)).filter(Number.isSafeInteger)))].sort((a, b) => a - b);
  const articleIds = [...new Set(ordered.filter((event) => matched.includes(Number(event.eventId))).flatMap((event) => (event.evidence || []).map((item) => Number(item.articleId)).filter(Number.isSafeInteger)))].sort((a, b) => a - b);
  const groupKey = createHash("sha256").update(`cross-article-event|${matched.join(",")}`).digest("hex");
  const anchorSubjectResolved = idsForRoles(anchor, SUBJECT_ROLES).length > 0;
  const groupStatus = !anchorSubjectResolved ? "abstain" : matched.length > 1 ? "matched" : candidates.length ? "candidate" : "single";
  if (!anchorSubjectResolved) abstained.unshift({ eventId: Number(anchor.eventId), status: "abstain", reason: "subject_unresolved" });
  return Object.freeze({
    status: groupStatus,
    anchorEventId: Number(anchor.eventId), groupKey, eventIds: Object.freeze(matched), articleIds: Object.freeze(articleIds), sourceIds: Object.freeze(sourceIds),
    candidates: Object.freeze(candidates), rejected: Object.freeze(rejected), abstained: Object.freeze(abstained),
    canonicalTimeline: Object.freeze({ eventId: Number(anchor.eventId), observationEventIds: Object.freeze(matched), observationCount: articleIds.length }),
    authority: Object.freeze({ destructiveMerge: false, independentConfirmation: anchorSubjectResolved && matched.length > 1 && sourceIds.length > 1, winner: null, sourceRanking: false }),
    metrics: Object.freeze({ eventsCompared: Math.max(0, ordered.length - 1), matchesAccepted: matched.length - 1, candidatesCreated: candidates.length, matchesRejected: rejected.length, abstentions: abstained.length, crossSourceMatches, sameSourceMatches, externalProviderCalls: 0 }),
  });
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

module.exports = { EVENT_STATUSES, MEMBERSHIP_TYPES, normalizeEventKey, intervalRelation, classifyEventMatch, classifyCrossArticleEventMatch, buildCrossArticleEventGroup, validateEventCandidate };
