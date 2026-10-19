"use strict";

const { createHash } = require("node:crypto");
const { PREDICATE_SET } = require("./relation-extraction");

function positiveId(value) {
  return /^[1-9][0-9]*$/.test(String(value)) ? Number(value) : null;
}

function shadowRelationOperationKey({ articleId, claimId, evidenceId, relation }) {
  return createHash("sha256").update(JSON.stringify([
    Number(articleId),
    Number(claimId),
    Number(evidenceId),
    Number(relation.subjectEntityId),
    relation.predicate,
    Number(relation.objectEntityId),
    Number(relation.evidence.start),
    Number(relation.evidence.end),
    relation.evidence.textSpan,
    relation.validFrom || null,
    relation.validUntil || null,
  ])).digest("hex");
}

function resolvedEntityIds(entities, resolutions) {
  if (!Array.isArray(entities) || !Array.isArray(resolutions) || entities.length !== resolutions.length) {
    throw new TypeError("relation_entity_resolution_mismatch");
  }
  return new Set(resolutions.map((item) => positiveId(item?.result?.entityId)).filter(Boolean));
}

function skipReason(claim, persisted, resolvedIds) {
  if (!claim || !PREDICATE_SET.has(claim.predicate)) return "unsupported_predicate";
  if (!persisted || !positiveId(persisted.claimId) || !positiveId(persisted.evidenceId)) return "missing_persisted_evidence";
  if (!claim.evidence || !Number.isSafeInteger(claim.evidence.start) || !Number.isSafeInteger(claim.evidence.end)
    || claim.evidence.start < 0 || claim.evidence.end <= claim.evidence.start
    || typeof claim.evidence.textSpan !== "string" || !claim.evidence.textSpan) return "missing_evidence";
  if (claim.polarity !== "affirmed") return "negated_or_unknown";
  if (claim.conditional === true) return "conditional";
  if (claim.uncertainty === true) return "uncertain";
  if (claim.status !== "observed" || claim.supportType !== "support") return "non_observed_claim";
  if (claim.attributionType !== "unknown" || claim.attributionEntityId != null) return "attributed_relation_ambiguous";
  const subjectEntityId = positiveId(claim.subjectEntityId);
  const objectEntityId = positiveId(claim.objectEntityId);
  if (!subjectEntityId || !objectEntityId || subjectEntityId === objectEntityId) return "subject_or_object_unresolved";
  if (!resolvedIds.has(subjectEntityId) || !resolvedIds.has(objectEntityId)) return "subject_or_object_unresolved";
  return null;
}

function buildEvidenceBackedRelationCandidates(input) {
  const articleId = positiveId(input?.articleId);
  if (!articleId) throw new TypeError("article_id_invalid");
  const claims = input?.claims;
  const persistedClaims = input?.persistedClaims;
  if (!Array.isArray(claims) || !Array.isArray(persistedClaims) || claims.length !== persistedClaims.length) {
    throw new TypeError("relation_claim_persistence_mismatch");
  }
  const resolvedIds = resolvedEntityIds(input?.entities || [], input?.resolutions || []);
  const candidates = [];
  const skipped = [];
  const seen = new Set();

  for (const [index, claim] of claims.entries()) {
    const persisted = persistedClaims[index];
    const reason = skipReason(claim, persisted, resolvedIds);
    if (reason) {
      skipped.push(Object.freeze({ claimIndex: index, predicate: claim?.predicate || null, reason }));
      continue;
    }
    const relation = Object.freeze({
      subjectEntityId: positiveId(claim.subjectEntityId),
      predicate: claim.predicate,
      objectEntityId: positiveId(claim.objectEntityId),
      confidence: claim.confidence,
      supportType: "support",
      validFrom: claim.validFrom || null,
      validUntil: claim.validUntil || null,
      evidence: Object.freeze({
        start: claim.evidence.start,
        end: claim.evidence.end,
        textSpan: claim.evidence.textSpan,
      }),
    });
    const operationKey = shadowRelationOperationKey({
      articleId,
      claimId: persisted.claimId,
      evidenceId: persisted.evidenceId,
      relation,
    });
    if (seen.has(operationKey)) {
      skipped.push(Object.freeze({ claimIndex: index, predicate: claim.predicate, reason: "duplicate_candidate" }));
      continue;
    }
    seen.add(operationKey);
    candidates.push(Object.freeze({
      relation,
      operationKey,
      semanticSource: Object.freeze({
        type: "validated_claim",
        claimId: positiveId(persisted.claimId),
        evidenceId: positiveId(persisted.evidenceId),
      }),
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
  buildEvidenceBackedRelationCandidates,
  shadowRelationOperationKey,
};
