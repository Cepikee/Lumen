"use strict";

const { createHash } = require("node:crypto");

// This is deliberately a small allowlist over the existing canonical claim
// vocabulary. Unknown predicates stay claims and never become events.
const SUPPORTED_EVENT_PREDICATES = Object.freeze({
  BUS_PURCHASE: Object.freeze({ expectedValue: "bus-purchase" }),
  EVENT_STATUS: Object.freeze({ expectedValue: "pilot-start", requiredModality: "completed" }),
  OPENING_EVENT: Object.freeze({ expectedValue: true, requiredModality: "completed" }),
});

const PARTICIPANT_ENTITY_TYPES = new Set(["person", "company", "organization", "project", "product"]);

function positiveId(value) {
  return /^[1-9][0-9]*$/.test(String(value)) ? Number(value) : null;
}

function articleLocalEventKey({ articleId, eventType, participantId, evidence, validFrom, validUntil }) {
  return createHash("sha256").update(JSON.stringify([
    Number(articleId),
    eventType,
    Number(participantId),
    Number(evidence.start),
    Number(evidence.end),
    String(evidence.textSpan),
    validFrom || null,
    validUntil || null,
  ])).digest("hex");
}

function exactParticipant(claim, entities, resolutions) {
  const explicit = positiveId(claim.subjectEntityId);
  if (explicit) return explicit;
  const evidence = claim.evidence;
  if (!evidence) return null;
  const candidates = [];
  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index];
    const entityId = positiveId(resolutions[index]?.result?.entityId);
    if (!entityId || !PARTICIPANT_ENTITY_TYPES.has(entity?.entityType)) continue;
    if (!entity.evidence || entity.evidence.start < evidence.start || entity.evidence.end > evidence.end) continue;
    candidates.push(entityId);
  }
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0] : null;
}

function valueMatches(actual, expected) {
  if (typeof expected === "boolean") return actual === expected;
  return String(actual ?? "") === String(expected);
}

function skipReason(claim, rule, participantId, persisted) {
  if (!rule) return "unsupported_predicate";
  if (!persisted || !positiveId(persisted.claimId) || !positiveId(persisted.evidenceId)) return "missing_persisted_evidence";
  if (!claim.evidence || !Number.isSafeInteger(claim.evidence.start) || !Number.isSafeInteger(claim.evidence.end) || typeof claim.evidence.textSpan !== "string" || !claim.evidence.textSpan) return "missing_evidence";
  if (claim.polarity !== "affirmed") return "negated_or_unknown";
  if (claim.conditional === true) return "conditional";
  if (claim.uncertainty === true) return "uncertain";
  if (claim.status !== "observed" || claim.supportType !== "support") return "non_observed_claim";
  // A reported or quoted source is not automatically the event actor. Until
  // the stable production layer has an explicit source/actor binding, abstain.
  if (claim.attributionType !== "unknown" || claim.attributionEntityId != null) return "attributed_actor_ambiguous";
  if (!valueMatches(claim.value, rule.expectedValue)) return "unsupported_event_value";
  if (rule.requiredModality && claim.modality !== rule.requiredModality) return "unsupported_modality";
  if (!participantId) return "participant_unresolved";
  return null;
}

function buildEvidenceBackedEventCandidates(input) {
  const articleId = positiveId(input?.articleId);
  if (!articleId) throw new TypeError("article_id_invalid");
  const claims = input?.claims;
  const persistedClaims = input?.persistedClaims;
  const entities = Array.isArray(input?.entities) ? input.entities : [];
  const resolutions = Array.isArray(input?.resolutions) ? input.resolutions : [];
  if (!Array.isArray(claims) || !Array.isArray(persistedClaims) || claims.length !== persistedClaims.length) {
    throw new TypeError("event_claim_persistence_mismatch");
  }
  if (entities.length !== resolutions.length) throw new TypeError("event_entity_resolution_mismatch");

  const candidates = [];
  const skipped = [];
  const seen = new Set();
  for (const [index, claim] of claims.entries()) {
    const rule = SUPPORTED_EVENT_PREDICATES[claim?.predicate];
    const participantId = exactParticipant(claim || {}, entities, resolutions);
    const reason = skipReason(claim || {}, rule, participantId, persistedClaims[index]);
    if (reason) {
      skipped.push(Object.freeze({ claimIndex: index, predicate: claim?.predicate || null, reason }));
      continue;
    }

    const eventType = String(claim.predicate).toLowerCase();
    const normalizedKey = articleLocalEventKey({
      articleId,
      eventType,
      participantId,
      evidence: claim.evidence,
      validFrom: claim.validFrom,
      validUntil: claim.validUntil,
    });
    if (seen.has(normalizedKey)) {
      skipped.push(Object.freeze({ claimIndex: index, predicate: claim.predicate, reason: "duplicate_candidate" }));
      continue;
    }
    seen.add(normalizedKey);
    const evidenceId = positiveId(persistedClaims[index].evidenceId);
    candidates.push(Object.freeze({
      eventType,
      canonicalTitle: claim.evidence.textSpan.trim().slice(0, 512),
      normalizedKey,
      status: "candidate",
      startAt: claim.validFrom || null,
      endAt: claim.validUntil || null,
      confidence: claim.confidence,
      modality: claim.modality || null,
      articleId,
      membershipType: "primary",
      evidenceId,
      entities: Object.freeze([Object.freeze({
        entityId: participantId,
        role: "subject",
        confidence: claim.confidence,
        validFrom: claim.validFrom || null,
        validUntil: claim.validUntil || null,
        evidenceId,
      })]),
    }));
  }

  return Object.freeze({
    status: candidates.length ? "completed" : "skipped",
    reason: candidates.length ? null : "deferred_insufficient_evidence",
    candidates: Object.freeze(candidates),
    skipped: Object.freeze(skipped),
    providerCalls: 0,
  });
}

module.exports = {
  SUPPORTED_EVENT_PREDICATES,
  articleLocalEventKey,
  buildEvidenceBackedEventCandidates,
};
