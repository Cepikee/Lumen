"use strict";

const { createHash } = require("node:crypto");
const { CLAIM_TYPES, CLAIM_STATUSES, SUPPORT_TYPES, ATTRIBUTION_TYPES, POLARITIES } = require("./claim-extraction");

function requireConnection(connection) { if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required"); }
function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function hash(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function safeJson(value) { try { return JSON.stringify(value); } catch { throw new TypeError("value_not_serializable"); } }

function claimObservationKey({ articleId, sourceId, extractionRunId, claim }) {
  const article = positiveId(articleId, "article_id");
  return hash(JSON.stringify([article, sourceId == null ? null : positiveId(sourceId, "source_id"), extractionRunId == null ? null : positiveId(extractionRunId, "extraction_run_id"), claim.subjectEntityId, claim.predicate, claim.objectEntityId, claim.claimType, claim.value, claim.normalizedValue, claim.validFrom || null, claim.validUntil || null, claim.evidence.start, claim.evidence.end, claim.evidence.textSpan]));
}
function claimEvidenceHash({ articleId, sourceId, evidence }) {
  return hash(JSON.stringify([positiveId(articleId, "article_id"), sourceId == null ? null : positiveId(sourceId, "source_id"), evidence.start, evidence.end, evidence.textSpan]));
}
function groupScope(claim) { return `${claim.validFrom || ""}/${claim.validUntil || ""}`.slice(0, 128); }
function validateClaimForPersistence(claim) {
  if (!claim || typeof claim !== "object") throw new TypeError("claim_invalid");
  if (!CLAIM_TYPES.includes(claim.claimType)) throw new TypeError("claim_type_invalid");
  if (!CLAIM_STATUSES.includes(claim.status || "observed")) throw new TypeError("status_invalid");
  if (!SUPPORT_TYPES.includes(claim.supportType || "support")) throw new TypeError("support_type_invalid");
  if (!ATTRIBUTION_TYPES.includes(claim.attributionType || "unknown")) throw new TypeError("attribution_type_invalid");
  if (!POLARITIES.includes(claim.polarity || "affirmed")) throw new TypeError("polarity_invalid");
  if (typeof claim.predicate !== "string" || !claim.predicate) throw new TypeError("predicate_invalid");
  positiveId(claim.evidence?.start + 1, "evidence_start");
  if (typeof claim.evidence.textSpan !== "string" || !claim.evidence.textSpan) throw new TypeError("evidence_invalid");
}

async function persistClaimsWithEvidence(connection, { claims, articleId, sourceId = null, extractionRunId = null, publicationTime = null, observedAt = new Date(), actor = "v2.claim", operationKeyPrefix = null }) {
  requireConnection(connection);
  if (!Array.isArray(claims)) throw new TypeError("claims_must_be_array");
  const article = positiveId(articleId, "article_id");
  const source = sourceId == null ? null : positiveId(sourceId, "source_id");
  const run = extractionRunId == null ? null : positiveId(extractionRunId, "extraction_run_id");
  const persisted = [];
  for (const claim of claims) {
    validateClaimForPersistence(claim);
    const observationKey = operationKeyPrefix ? hash(`${operationKeyPrefix}:${claimObservationKey({ articleId: article, sourceId: source, extractionRunId: run, claim })}`) : claimObservationKey({ articleId: article, sourceId: source, extractionRunId: run, claim });
    let groupId = null;
    if (claim.subjectEntityId != null) {
      const [groupInsert] = await connection.execute(
        `INSERT INTO v2_claim_groups (subject_entity_id,predicate,time_scope_key,resolution_status,created_at,updated_at)
         VALUES (?,?,?,'unresolved',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),updated_at=UTC_TIMESTAMP(6)`,
        [positiveId(claim.subjectEntityId, "subject_entity_id"), claim.predicate, groupScope(claim)],
      );
      groupId = Number(groupInsert.insertId);
    }
    const valueJson = safeJson({ claimText: claim.claimText, value: claim.value, polarity: claim.polarity, uncertainty: claim.uncertainty === true, conditional: claim.conditional === true, modality: claim.modality, attributionType: claim.attributionType, attributionEntityId: claim.attributionEntityId == null ? null : Number(claim.attributionEntityId) });
    const [claimInsert] = await connection.execute(
      `INSERT INTO v2_claims
       (subject_entity_id,predicate,object_entity_id,value_json,normalized_value,claim_type,article_id,source_id,valid_from,valid_until,observed_at,publication_time,status,confidence,extraction_run_id,claim_group_id,observation_key,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),updated_at=UTC_TIMESTAMP(6)`,
      [claim.subjectEntityId == null ? null : positiveId(claim.subjectEntityId, "subject_entity_id"), claim.predicate, claim.objectEntityId == null ? null : positiveId(claim.objectEntityId, "object_entity_id"), valueJson, claim.normalizedValue, claim.claimType, article, source, claim.validFrom || null, claim.validUntil || null, observedAt, publicationTime, claim.status || "observed", claim.confidence, run, groupId, observationKey],
    );
    const claimId = Number(claimInsert.insertId);
    const [evidenceInsert] = await connection.execute(
      `INSERT INTO v2_claim_evidence
       (claim_id,article_id,source_id,text_span,span_hash,evidence_type,support_type,extraction_run_id,confidence,publication_time,created_at)
       VALUES (?,?,?,?,?,'claim_span',?,?,?,?,UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [claimId, article, source, claim.evidence.textSpan, claimEvidenceHash({ articleId: article, sourceId: source, evidence: claim.evidence }), claim.supportType || "support", run, claim.confidence, publicationTime],
    );
    persisted.push({ claimId, evidenceId: Number(evidenceInsert.insertId), observationKey, groupId, idempotent: Number(claimInsert.affectedRows) === 0 && Number(evidenceInsert.affectedRows) === 0 });
  }
  return { actor, count: persisted.length, claims: persisted };
}

module.exports = { claimObservationKey, claimEvidenceHash, persistClaimsWithEvidence, persistClaimWithEvidence: persistClaimsWithEvidence };
