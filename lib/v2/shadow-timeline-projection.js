"use strict";

const PRECISION_RANK = Object.freeze({ timestamp: "0", date: "1", month: "2", year: "3", range: "4", unknown: "9" });
const PLANNED_MODALITIES = new Set(["future", "plan", "planned", "scheduled", "possible", "expected"]);

function positiveId(value) {
  return /^[1-9][0-9]*$/.test(String(value)) ? Number(value) : null;
}

function iso(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function addUtc(value, unit) {
  const match = unit === "year" ? /^(\d{4})$/ : /^(\d{4})-(\d{2})$/;
  const parts = String(value).match(match);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = unit === "month" ? Number(parts[2]) - 1 : 0;
  return new Date(Date.UTC(unit === "year" ? year + 1 : month === 11 ? year + 1 : year, unit === "year" ? 0 : (month + 1) % 12, 1)).toISOString();
}

function temporalPoint(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return { precision: "year", lower: `${text}-01-01T00:00:00.000Z`, upper: addUtc(text, "year"), point: null };
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return { precision: "month", lower: `${text}-01T00:00:00.000Z`, upper: addUtc(text, "month"), point: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const point = iso(`${text}T00:00:00.000Z`);
    return point ? { precision: "date", lower: point, upper: null, point } : null;
  }
  const point = iso(text);
  return point ? { precision: "timestamp", lower: point, upper: null, point } : null;
}

function temporalScope(candidate) {
  const start = temporalPoint(candidate?.startAt);
  const end = temporalPoint(candidate?.endAt);
  if (candidate?.startAt != null && !start) return null;
  if (candidate?.endAt != null && !end) return null;
  if (!start && !end) return { precision: "unknown", validAt: null, validFrom: null, validUntil: null };
  if (!start && end) return null;
  if (start && end) {
    const validUntil = end.upper || end.point || end.lower;
    if (!validUntil || Date.parse(start.lower) >= Date.parse(validUntil)) return null;
    return { precision: "range", validAt: null, validFrom: start.lower, validUntil };
  }
  if (start.precision === "year" || start.precision === "month") {
    return { precision: start.precision, validAt: null, validFrom: start.lower, validUntil: start.upper };
  }
  return { precision: start.precision, validAt: start.point, validFrom: null, validUntil: null };
}

function orderingKey(scope, eventId) {
  const stableId = String(eventId).padStart(20, "0");
  if (scope.precision === "unknown") return `9-unknown/${stableId}`;
  const temporal = scope.validAt || scope.validFrom;
  return `0-known/${temporal}/${PRECISION_RANK[scope.precision]}/${stableId}`;
}

function buildArticleTimelineProjection(input) {
  const articleId = positiveId(input?.articleId);
  if (!articleId) throw new TypeError("article_id_invalid");
  const candidates = input?.eventCandidates;
  const persistedEvents = input?.persistedEvents;
  if (!Array.isArray(candidates) || !Array.isArray(persistedEvents) || candidates.length !== persistedEvents.length) {
    throw new TypeError("timeline_event_persistence_mismatch");
  }

  const items = [];
  const skipped = [];
  const temporalByEvent = new Map();
  const conflictingEvents = new Set();
  for (const [index, candidate] of candidates.entries()) {
    const eventId = positiveId(persistedEvents[index]?.eventId);
    if (!eventId) continue;
    const signature = JSON.stringify([candidate?.startAt || null, candidate?.endAt || null]);
    if (temporalByEvent.has(eventId) && temporalByEvent.get(eventId) !== signature) conflictingEvents.add(eventId);
    else temporalByEvent.set(eventId, signature);
  }
  const seenItems = new Set();
  let unknownTime = 0;
  for (const [index, candidate] of candidates.entries()) {
    const persisted = persistedEvents[index];
    const eventId = positiveId(persisted?.eventId);
    const evidenceId = positiveId(candidate?.evidenceId);
    let reason = null;
    if (!eventId || positiveId(persisted?.articleId) !== articleId) reason = "persisted_event_mismatch";
    else if (conflictingEvents.has(eventId)) reason = "temporal_conflict";
    else if (!evidenceId) reason = "missing_event_evidence";
    else if (PLANNED_MODALITIES.has(String(candidate?.modality || "").toLowerCase())) reason = "planned_event";
    const scope = reason ? null : temporalScope(candidate);
    if (!reason && !scope) reason = "temporal_scope_invalid";
    if (reason) {
      skipped.push(Object.freeze({ eventIndex: index, eventId, reason }));
      continue;
    }
    const itemKey = `${eventId}|${orderingKey(scope, eventId)}`;
    if (seenItems.has(itemKey)) {
      skipped.push(Object.freeze({ eventIndex: index, eventId, reason: "duplicate_timeline_item" }));
      continue;
    }
    seenItems.add(itemKey);
    if (scope.precision === "unknown") unknownTime += 1;
    items.push(Object.freeze({
      ownerType: "article",
      ownerId: articleId,
      item: Object.freeze({
        itemType: "event",
        itemId: eventId,
        validAt: scope.validAt,
        validFrom: scope.validFrom,
        validUntil: scope.validUntil,
        displayAt: scope.validAt,
        confidence: candidate.confidence == null ? null : candidate.confidence,
        visibility: "public",
        orderingKey: orderingKey(scope, eventId),
        status: candidate.status || "candidate",
      }),
      provenance: Object.freeze({ eventId, articleId, evidenceId }),
      timePrecision: scope.precision,
    }));
  }
  items.sort((left, right) => left.item.orderingKey.localeCompare(right.item.orderingKey));
  return Object.freeze({
    status: items.length ? "completed" : "skipped",
    reason: items.length ? null : "no_authoritative_events",
    items: Object.freeze(items),
    skipped: Object.freeze(skipped),
    unknownTime,
    providerCalls: 0,
  });
}

module.exports = { PLANNED_MODALITIES, buildArticleTimelineProjection, orderingKey, temporalPoint, temporalScope };
