"use strict";

const { createHash } = require("node:crypto");
const { CONTRACT_VERSIONS } = require("./contract-versions");

const CLAIM_TYPES = Object.freeze(["numeric", "categorical", "boolean", "status", "temporal", "entity", "relation", "text"]);
const CONFLICT_TYPES = Object.freeze(["numeric", "categorical", "temporal", "entity_identity", "relation"]);
const PUBLIC_STATUSES = new Set(["observed", "reported", "verified"]);
const FACTUAL_MODALITIES = new Set([null, "asserted", "completed", "reported", "quoted", "journalist_statement"]);

function invalid(errors) { return { status: "invalid", errors }; }
function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function optionalId(value, field) { return value == null ? null : positiveId(value, field); }
function field(claim, camel, snake) { return claim?.[camel] ?? claim?.[snake]; }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function same(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function iso(value) { if (value == null) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }

function evidenceItems(claim, claimId, articleId, sourceId) {
  if (!Array.isArray(claim.evidence) || !claim.evidence.length) return [];
  return claim.evidence.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = optionalId(item.id ?? item.evidenceId, "evidence_id");
    const itemArticleId = optionalId(item.articleId ?? item.article_id, "evidence_article_id");
    const itemSourceId = optionalId(item.sourceId ?? item.source_id, "evidence_source_id");
    const textSpan = typeof item.textSpan === "string" && item.textSpan.trim() ? item.textSpan : null;
    if (!id || itemArticleId !== articleId || itemSourceId !== sourceId || !textSpan) return [];
    return [{ id, claimId, articleId, sourceId, textSpan, supportType: typeof item.supportType === "string" ? item.supportType : null }];
  });
}

function canonicalClaim(claim) {
  if (!claim || typeof claim !== "object") throw new TypeError("claim_required");
  const id = positiveId(claim.id ?? claim.claimId, "claim_id");
  const subjectEntityId = positiveId(field(claim, "subjectEntityId", "subject_entity_id"), "subject_entity_id");
  const objectEntityId = optionalId(field(claim, "objectEntityId", "object_entity_id"), "object_entity_id");
  const articleId = positiveId(field(claim, "articleId", "article_id"), "article_id");
  const sourceId = positiveId(field(claim, "sourceId", "source_id"), "source_id");
  const predicate = String(claim.predicate || "").trim();
  const claimType = String(field(claim, "claimType", "claim_type") || "").trim().toLowerCase();
  if (!predicate || predicate.length > 128) throw new TypeError("predicate_invalid");
  if (!CLAIM_TYPES.includes(claimType)) throw new TypeError("claim_type_invalid");
  const qualifiers = claim.qualifiers && typeof claim.qualifiers === "object" ? claim.qualifiers : claim;
  const polarity = String(qualifiers.polarity || "unknown").toLowerCase();
  const modality = qualifiers.modality == null ? null : String(qualifiers.modality).toLowerCase();
  const status = String(claim.status || "reported").toLowerCase();
  const attribution = claim.attribution && typeof claim.attribution === "object" ? claim.attribution : { type: claim.attributionType ?? null, entityId: claim.attributionEntityId ?? null };
  return {
    id, subjectEntityId, objectEntityId, predicate, claimType,
    normalizedValue: field(claim, "normalizedValue", "normalized_value") ?? null,
    value: field(claim, "value", "valueJson") ?? field(claim, "value_json") ?? null,
    unit: claim.unit ?? (claim.value && typeof claim.value === "object" ? claim.value.unit : null) ?? null,
    validFrom: field(claim, "validFrom", "valid_from") ?? claim.temporal?.start ?? null,
    validUntil: field(claim, "validUntil", "valid_until") ?? claim.temporal?.end ?? null,
    modality, conditional: qualifiers.conditional === true, uncertainty: qualifiers.uncertainty === true,
    polarity, status, attribution, articleId, sourceId,
    entityResolved: claim.entityResolved !== false && claim.subjectEntityStatus !== "unresolved" && claim.objectEntityStatus !== "unresolved",
    evidence: evidenceItems(claim, id, articleId, sourceId),
    source: claim.source && typeof claim.source === "object" ? claim.source : { id: sourceId },
  };
}

function temporalEligibility(a, b) {
  const af = iso(a.validFrom), au = iso(a.validUntil), bf = iso(b.validFrom), bu = iso(b.validUntil);
  if ((a.validFrom != null && !af) || (a.validUntil != null && !au) || (b.validFrom != null && !bf) || (b.validUntil != null && !bu)) return { eligible: false, reason: "temporal_invalid" };
  if ((!af && !au) || (!bf && !bu)) return { eligible: false, reason: "temporal_scope_unknown" };
  if (af !== bf || au !== bu) return { eligible: false, reason: "temporal_scope_mismatch" };
  if (af && au && Date.parse(au) <= Date.parse(af)) return { eligible: false, reason: "temporal_invalid" };
  return { eligible: true, scope: { validFrom: af, validUntil: au } };
}

function unitInfo(unit) {
  const raw = String(unit || "").trim().toLocaleLowerCase("hu");
  const aliases = {
    "fő": ["person", 1], person: ["person", 1], people: ["person", 1], ember: ["person", 1],
    "%": ["percent", 1], percent: ["percent", 1], "százalék": ["percent", 1],
    huf: ["HUF", 1], forint: ["HUF", 1], "million huf": ["HUF", 1e6], "millió huf": ["HUF", 1e6], "billion huf": ["HUF", 1e9], "milliárd huf": ["HUF", 1e9],
    eur: ["EUR", 1], "euró": ["EUR", 1], "million eur": ["EUR", 1e6], "millió eur": ["EUR", 1e6],
    m: ["distance", 1], "méter": ["distance", 1], km: ["distance", 1000], "kilométer": ["distance", 1000],
  };
  return aliases[raw] ? { dimension: aliases[raw][0], factor: aliases[raw][1], raw } : raw ? { dimension: `opaque:${raw}`, factor: 1, raw } : null;
}

function finite(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function numericInterval(claim) {
  const raw = claim.value && typeof claim.value === "object" ? claim.value : { value: claim.value };
  const kind = String(raw.kind ?? raw.valueKind ?? raw.qualifier ?? "exact").toLowerCase();
  if (claim.uncertainty || kind === "approximate" || kind === "estimate") return { eligible: false, reason: "approximate_or_uncertain" };
  const unit = unitInfo(raw.unit ?? claim.unit);
  if (!unit) return { eligible: false, reason: "unit_missing" };
  if (kind === "range" || raw.from != null || raw.to != null) {
    const from = finite(raw.from); const to = finite(raw.to);
    if (from == null || to == null || from > to) return { eligible: false, reason: "range_invalid" };
    return { eligible: true, unit, lower: from * unit.factor, upper: to * unit.factor, kind: "range" };
  }
  const scalar = finite(raw.value ?? raw.amount ?? claim.normalizedValue);
  if (scalar == null) return { eligible: false, reason: "numeric_invalid" };
  if (["lower_bound", "minimum", "min"].includes(kind)) return { eligible: true, unit, lower: scalar * unit.factor, upper: Infinity, kind: "lower_bound" };
  if (["upper_bound", "maximum", "max"].includes(kind)) return { eligible: true, unit, lower: -Infinity, upper: scalar * unit.factor, kind: "upper_bound" };
  return { eligible: true, unit, lower: scalar * unit.factor, upper: scalar * unit.factor, kind: "exact" };
}

function scalarValue(claim) {
  if (claim.normalizedValue != null) return String(claim.normalizedValue).trim().toLowerCase();
  if (claim.value == null || typeof claim.value === "object") return null;
  return String(claim.value).trim().toLowerCase();
}

function eligibility(a, b) {
  if (a.id === b.id) return { eligible: false, reason: "self_reference" };
  if (a.sourceId === b.sourceId) return { eligible: false, reason: "same_source" };
  if (!a.entityResolved || !b.entityResolved) return { eligible: false, reason: "entity_unresolved" };
  if (!a.evidence.length || !b.evidence.length) return { eligible: false, reason: "evidence_missing" };
  if (a.subjectEntityId !== b.subjectEntityId || a.predicate !== b.predicate || a.claimType !== b.claimType) return { eligible: false, reason: "scope_or_type_mismatch" };
  if (a.objectEntityId !== b.objectEntityId) return { eligible: false, reason: "object_identity_mismatch" };
  if (!PUBLIC_STATUSES.has(a.status) || !PUBLIC_STATUSES.has(b.status) || a.status !== b.status) return { eligible: false, reason: "claim_status_incompatible" };
  if (a.conditional || b.conditional) return { eligible: false, reason: "conditional_claim" };
  if (a.uncertainty || b.uncertainty) return { eligible: false, reason: "uncertain_claim" };
  if (!FACTUAL_MODALITIES.has(a.modality) || !FACTUAL_MODALITIES.has(b.modality) || a.modality !== b.modality) return { eligible: false, reason: "modality_mismatch" };
  if (!same(a.attribution, b.attribution)) return { eligible: false, reason: "attribution_mismatch" };
  const temporal = temporalEligibility(a, b);
  return temporal.eligible ? { eligible: true, temporal } : temporal;
}

function compareClaims(a, b) {
  if (a.polarity === "unknown" || b.polarity === "unknown") return { conflict: false, reason: "polarity_unknown", abstain: true };
  if (a.claimType === "numeric") {
    const left = numericInterval(a); const right = numericInterval(b);
    if (!left.eligible || !right.eligible) return { conflict: false, reason: left.reason || right.reason, abstain: true };
    if (left.unit.dimension !== right.unit.dimension) return { conflict: false, reason: "unit_dimension_mismatch", abstain: true };
    const overlaps = Math.max(left.lower, right.lower) <= Math.min(left.upper, right.upper);
    if (a.polarity !== b.polarity) {
      const identical = left.lower === right.lower && left.upper === right.upper;
      return identical ? { conflict: true, type: "categorical", reason: "polarity_conflict" } : { conflict: false, reason: "polarity_value_mismatch", abstain: true };
    }
    return overlaps ? { conflict: false, reason: "numeric_ranges_compatible" } : { conflict: true, type: "numeric", reason: "numeric_conflict" };
  }
  const left = scalarValue(a); const right = scalarValue(b);
  if (left == null || right == null) return { conflict: false, reason: "value_missing", abstain: true };
  if (a.polarity !== b.polarity) return left === right ? { conflict: true, type: "categorical", reason: "polarity_conflict" } : { conflict: false, reason: "polarity_value_mismatch", abstain: true };
  if (["boolean", "status", "categorical"].includes(a.claimType)) return left === right ? { conflict: false, reason: "same_value" } : { conflict: true, type: "categorical", reason: "status_conflict" };
  return { conflict: false, reason: "claim_type_not_conflict_safe", abstain: true };
}

function fingerprint(a, b, comparison, temporal) {
  const ids = [a.id, b.id].sort((x, y) => x - y);
  return createHash("sha256").update(JSON.stringify({ ids, predicate: a.predicate, type: comparison.type, reason: comparison.reason, temporal: temporal.scope, version: CONTRACT_VERSIONS.conflictHistory })).digest("hex");
}

function detectConflict(left, right) {
  let a; let b;
  try { a = canonicalClaim(left); b = canonicalClaim(right); } catch (error) { return invalid([error.message]); }
  const eligible = eligibility(a, b);
  if (!eligible.eligible) return { status: eligible.reason?.endsWith("invalid") ? "invalid" : "no_conflict", reason: eligible.reason, claims: [a, b], abstained: true };
  const comparison = compareClaims(a, b);
  if (!comparison.conflict) return { status: "no_conflict", reason: comparison.reason, claims: [a, b], abstained: comparison.abstain === true };
  const claims = [a, b].sort((x, y) => x.sourceId - y.sourceId || x.id - y.id);
  return {
    status: "candidate", conflictType: comparison.type, fingerprint: fingerprint(a, b, comparison, eligible.temporal), state: "open", severity: "review",
    scopeType: "entity", scopeId: a.subjectEntityId, reason: comparison.reason, claims,
    sources: claims.map((claim) => claim.source), temporal: eligible.temporal.scope,
    comparison: { matcherVersion: CONTRACT_VERSIONS.conflictHistory, reason: comparison.reason, winner: null },
    evidence: claims.flatMap((claim) => claim.evidence), attribution: claims.map((claim) => ({ claimId: claim.id, attribution: claim.attribution })),
    automaticWinner: null,
  };
}

function observationClaim(group, observation) {
  return {
    id: observation.claimIds?.[0], articleId: observation.articleIds?.[0], sourceId: observation.source?.id, source: observation.source,
    subjectEntityId: group.subjectEntityId, objectEntityId: observation.objectEntityId, predicate: group.predicate, claimType: group.claimType,
    normalizedValue: observation.normalizedValue, value: observation.value, temporal: observation.temporal, qualifiers: observation.qualifiers,
    status: observation.status, attribution: observation.attribution, evidence: observation.evidence, entityResolved: true,
  };
}

function differentCandidate(left, right, leftObservation, rightObservation) {
  const leftSource = leftObservation?.source?.key; const rightSource = rightObservation?.source?.key;
  if (!leftSource || !rightSource || leftSource === rightSource) return false;
  return left.coverageBySource?.some((entry) => entry?.source?.key === rightSource && entry.state === "different_observation")
    && right.coverageBySource?.some((entry) => entry?.source?.key === leftSource && entry.state === "different_observation");
}

function detectComparisonConflicts(comparison) {
  const emptyMetrics = { candidatesChecked: 0, conflictsFound: 0, numericConflicts: 0, polarityConflicts: 0, statusConflicts: 0, abstentions: 0 };
  if (!comparison || typeof comparison !== "object" || !Array.isArray(comparison.claims)) return { contractVersion: CONTRACT_VERSIONS.conflictHistory, status: "invalid_input", conflicts: [], metrics: emptyMetrics, authority: { winner: null, ranking: false, reliabilityScore: null, majorityAsTruth: false }, ai: { providerCalls: 0 } };
  const conflicts = []; let candidatesChecked = 0; let abstentions = 0;
  for (let i = 0; i < comparison.claims.length; i += 1) for (let j = i + 1; j < comparison.claims.length; j += 1) {
    const left = comparison.claims[i]; const right = comparison.claims[j];
    for (const leftObservation of left.observations || []) for (const rightObservation of right.observations || []) {
      if (!differentCandidate(left, right, leftObservation, rightObservation)) continue;
      candidatesChecked += 1;
      const result = detectConflict(observationClaim(left, leftObservation), observationClaim(right, rightObservation));
      if (result.status === "candidate" && !conflicts.some((item) => item.fingerprint === result.fingerprint)) conflicts.push(result);
      else if (result.abstained || result.status === "invalid") abstentions += 1;
    }
  }
  conflicts.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  const numericConflicts = conflicts.filter((item) => item.reason === "numeric_conflict").length;
  const polarityConflicts = conflicts.filter((item) => item.reason === "polarity_conflict").length;
  const statusConflicts = conflicts.filter((item) => item.reason === "status_conflict").length;
  const status = comparison.status === "insufficient_evidence" ? "insufficient_evidence" : conflicts.length ? "ready" : "empty";
  return { contractVersion: CONTRACT_VERSIONS.conflictHistory, status, conflicts, metrics: { candidatesChecked, conflictsFound: conflicts.length, numericConflicts, polarityConflicts, statusConflicts, abstentions }, authority: { winner: null, ranking: false, reliabilityScore: null, majorityAsTruth: false }, ai: { providerCalls: 0 } };
}

function validateConflict(input) {
  if (!input || typeof input !== "object") return invalid(["conflict_required"]);
  if (!CONFLICT_TYPES.includes(input.conflictType)) return invalid(["conflict_type_invalid"]);
  if (!/^[a-f0-9]{64}$/.test(String(input.fingerprint))) return invalid(["fingerprint_invalid"]);
  if (typeof input.scopeType !== "string" || !/^[a-z][a-z0-9_]{0,31}$/.test(input.scopeType)) return invalid(["scope_type_invalid"]);
  if (!Number.isSafeInteger(Number(input.scopeId)) || Number(input.scopeId) < 1) return invalid(["scope_id_invalid"]);
  if (typeof input.severity !== "string" || !/^[a-z][a-z0-9_]{0,23}$/.test(input.severity)) return invalid(["severity_invalid"]);
  if (!Array.isArray(input.claims) || input.claims.length < 2 || !Array.isArray(input.evidence) || input.evidence.length < 2) return invalid(["claims_and_evidence_required"]);
  if (input.state !== "open" || input.automaticWinner !== null) return invalid(["automatic_resolution_forbidden"]);
  return { status: "valid", result: input };
}

module.exports = { CLAIM_TYPES, CONFLICT_TYPES, canonicalClaim, detectConflict, detectComparisonConflicts, validateConflict };
