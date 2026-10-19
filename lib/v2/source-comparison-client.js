"use strict";

const STATES = new Set(["shared", "source_only", "not_covered", "different_observation"]);
const safeId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const safeCount = (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
function source(item) {
  if (!item || typeof item !== "object") return null;
  const id = safeId(item.id); const key = typeof item.key === "string" && item.key.trim() ? item.key.trim() : null; const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : null;
  return id && key && name ? Object.freeze({ id, key, name }) : null;
}
function evidence(item) {
  if (!item || typeof item !== "object") return null;
  const id = safeId(item.id); const claimId = safeId(item.claimId); const articleId = safeId(item.articleId); const sourceId = safeId(item.sourceId); const textSpan = typeof item.textSpan === "string" && item.textSpan.trim() ? item.textSpan : null;
  return id && claimId && articleId && sourceId && textSpan ? Object.freeze({ id, claimId, articleId, sourceId, textSpan, supportType: typeof item.supportType === "string" ? item.supportType : null }) : null;
}
function conflict(item) {
  if (!item || typeof item !== "object" || !/^[a-f0-9]{64}$/.test(String(item.fingerprint)) || !["numeric", "categorical"].includes(item.conflictType) || item.state !== "open" || item.automaticWinner !== null) return null;
  const items = Array.isArray(item.evidence) ? item.evidence.map(evidence).filter(Boolean) : [];
  return items.length >= 2 ? Object.freeze({ fingerprint: item.fingerprint, type: item.conflictType, reason: typeof item.reason === "string" ? item.reason : "potential_conflict", state: "open", evidence: items, sources: Array.isArray(item.sources) ? item.sources.map(source).filter(Boolean) : [], temporal: item.temporal && typeof item.temporal === "object" ? item.temporal : null, automaticWinner: null }) : null;
}
function normalizeSourceComparisonResponse(payload) {
  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") throw new TypeError("v2_source_comparison_response_invalid");
  const data = payload.data;
  const sources = Array.isArray(data.sources) ? data.sources.map(source).filter(Boolean).map((item) => Object.freeze({ ...item, articleCount: safeCount(data.sources.find((candidate) => safeId(candidate?.id) === item.id)?.articleCount), firstPublishedAt: typeof data.sources.find((candidate) => safeId(candidate?.id) === item.id)?.firstPublishedAt === "string" ? data.sources.find((candidate) => safeId(candidate?.id) === item.id).firstPublishedAt : null, lastPublishedAt: typeof data.sources.find((candidate) => safeId(candidate?.id) === item.id)?.lastPublishedAt === "string" ? data.sources.find((candidate) => safeId(candidate?.id) === item.id).lastPublishedAt : null })) : [];
  const claims = Array.isArray(data.claims) ? data.claims.flatMap((claim) => {
    if (!claim || typeof claim !== "object" || typeof claim.key !== "string" || !claim.key || typeof claim.predicate !== "string" || !["shared", "source_only"].includes(claim.coverage)) return [];
    const observations = Array.isArray(claim.observations) ? claim.observations.flatMap((observation) => {
      const itemSource = source(observation?.source); const evidenceItems = Array.isArray(observation?.evidence) ? observation.evidence.map(evidence).filter(Boolean) : [];
      if (!itemSource || !evidenceItems.length) return [];
      return [Object.freeze({ source: itemSource, claimIds: Array.isArray(observation.claimIds) ? observation.claimIds.map(safeId).filter(Boolean) : [], articleIds: Array.isArray(observation.articleIds) ? observation.articleIds.map(safeId).filter(Boolean) : [], value: observation.value ?? null, normalizedValue: typeof observation.normalizedValue === "string" ? observation.normalizedValue : null, objectEntityId: safeId(observation.objectEntityId), attribution: observation.attribution && typeof observation.attribution === "object" ? observation.attribution : null, qualifiers: observation.qualifiers && typeof observation.qualifiers === "object" ? observation.qualifiers : null, temporal: observation.temporal && typeof observation.temporal === "object" ? observation.temporal : { start: null, end: null }, evidence: evidenceItems, evidenceCount: evidenceItems.length, status: typeof observation.status === "string" ? observation.status : null })];
    }) : [];
    if (!observations.length) return [];
    const coverageBySource = Array.isArray(claim.coverageBySource) ? claim.coverageBySource.flatMap((entry) => { const itemSource = source(entry?.source); return itemSource && STATES.has(entry?.state) ? [Object.freeze({ source: itemSource, state: entry.state })] : []; }) : [];
    return [Object.freeze({ key: claim.key, predicate: claim.predicate, claimType: typeof claim.claimType === "string" ? claim.claimType : null, subjectEntityId: safeId(claim.subjectEntityId), coverage: claim.coverage, observations, coverageBySource })];
  }) : [];
  const pagination = data.pagination && typeof data.pagination === "object" ? Object.freeze({ page: Math.max(1, safeCount(data.pagination.page)), pages: safeCount(data.pagination.pages), total: safeCount(data.pagination.total) }) : Object.freeze({ page: 1, pages: 0, total: 0 });
  const rawConflicts = data.conflictDetection && typeof data.conflictDetection === "object" ? data.conflictDetection : null;
  const conflicts = Array.isArray(rawConflicts?.conflicts) ? rawConflicts.conflicts.map(conflict).filter(Boolean) : [];
  const conflictDetection = Object.freeze({ status: ["ready", "empty", "insufficient_evidence"].includes(rawConflicts?.status) ? rawConflicts.status : "empty", conflicts: Object.freeze(conflicts), authority: Object.freeze({ winner: null, ranking: false, reliabilityScore: null }) });
  return Object.freeze({ status: ["ready", "empty", "insufficient_evidence"].includes(data.status) ? data.status : claims.length ? "ready" : "empty", sources: Object.freeze(sources), claims: Object.freeze(claims), pagination, conflictDetection });
}

module.exports = { normalizeSourceComparisonResponse };
