"use strict";

const ROLE_RULES = Object.freeze({
  BUS_PURCHASE: Object.freeze({
    subjectTypes: new Set(["company", "organization"]),
    objectTypes: new Set(["project", "product"]),
  }),
});

function positiveId(value) {
  return /^[1-9][0-9]*$/.test(String(value)) ? Number(value) : null;
}

function evidenceContains(claim, entity) {
  return claim?.evidence
    && entity?.evidence
    && Number.isSafeInteger(claim.evidence.start)
    && Number.isSafeInteger(claim.evidence.end)
    && Number.isSafeInteger(entity.evidence.start)
    && Number.isSafeInteger(entity.evidence.end)
    && entity.evidence.start >= claim.evidence.start
    && entity.evidence.end <= claim.evidence.end;
}

function uniqueResolvedId(matches) {
  const ids = [...new Set(matches.map((item) => item.entityId).filter(Boolean))];
  return ids.length === 1 ? ids[0] : null;
}

function canonicalResolutionEntityId(item) {
  const result = item?.result || item;
  if (result?.resolutionStatus !== "resolved_exact" || result?.provisional === true) return null;
  if (String(result?.entityStatus || result?.entity?.status || "").toLowerCase() === "unresolved") return null;
  return positiveId(result?.entityId);
}

/**
 * Binds validated claims only when their evidence contains exactly one
 * resolved entity for every predicate-specific semantic role. Ambiguous or
 * unsupported claims remain explicitly unbound.
 */
function bindResolvedClaimEntities({ claims, entities, resolutions } = {}) {
  if (!Array.isArray(claims)) throw new TypeError("claims_must_be_array");
  if (!Array.isArray(entities) || !Array.isArray(resolutions) || entities.length !== resolutions.length) {
    throw new TypeError("claim_entity_resolution_mismatch");
  }
  const resolved = entities.map((entity, index) => ({
    entity,
    entityId: canonicalResolutionEntityId(resolutions[index]),
  })).filter((item) => item.entityId);

  return Object.freeze(claims.map((claim) => {
    const rule = ROLE_RULES[claim?.predicate];
    if (!rule) return claim;
    const scoped = resolved.filter((item) => evidenceContains(claim, item.entity));
    const subjectEntityId = positiveId(claim.subjectEntityId) || uniqueResolvedId(
      scoped.filter((item) => rule.subjectTypes.has(item.entity.entityType)),
    );
    const objectEntityId = positiveId(claim.objectEntityId) || uniqueResolvedId(
      scoped.filter((item) => rule.objectTypes.has(item.entity.entityType)),
    );
    if (!subjectEntityId && !objectEntityId) return claim;
    return Object.freeze({ ...claim, subjectEntityId, objectEntityId });
  }));
}

module.exports = { ROLE_RULES, bindResolvedClaimEntities, canonicalResolutionEntityId };
