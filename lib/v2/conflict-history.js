"use strict";

const { createHash } = require("node:crypto");
const { CONTRACT_VERSIONS } = require("./contract-versions");

const CLAIM_TYPES = Object.freeze(["numeric", "categorical", "boolean", "status", "temporal", "entity", "relation", "text"]);
const CONFLICT_TYPES = Object.freeze(["numeric", "categorical", "temporal", "entity_identity", "relation"]);
const COMPARABLE_TYPES = new Set(["numeric", "categorical", "boolean", "status", "temporal", "entity", "relation"]);

function invalid(errors) { return { status: "invalid", errors }; }
function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function finiteConfidence(value, field = "confidence") {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new TypeError(`${field}_invalid`);
  return number;
}
function claimId(claim) { return positiveId(claim?.id ?? claim?.claimId, "claim_id"); }
function field(claim, camel, snake) { return claim?.[camel] ?? claim?.[snake]; }
function canonicalClaim(claim) {
  if (!claim || typeof claim !== "object") throw new TypeError("claim_required");
  const id = claimId(claim);
  const subjectEntityId = field(claim, "subjectEntityId", "subject_entity_id");
  if (subjectEntityId == null) throw new TypeError("subject_entity_id_required");
  const predicate = field(claim, "predicate", "predicate");
  const claimType = String(field(claim, "claimType", "claim_type") || "").trim().toLowerCase();
  if (!Number.isSafeInteger(Number(subjectEntityId)) || Number(subjectEntityId) <= 0) throw new TypeError("subject_entity_id_invalid");
  if (typeof predicate !== "string" || !predicate.trim() || predicate.length > 128) throw new TypeError("predicate_invalid");
  if (!CLAIM_TYPES.includes(claimType)) throw new TypeError("claim_type_invalid");
  finiteConfidence(claim.confidence);
  finiteConfidence(field(claim, "extractionConfidence", "extraction_confidence"), "extraction_confidence");
  return {
    id,
    subjectEntityId: Number(subjectEntityId),
    predicate: predicate.trim(),
    claimType,
    normalizedValue: field(claim, "normalizedValue", "normalized_value") ?? null,
    value: field(claim, "value", "valueJson") ?? field(claim, "value_json") ?? null,
    unit: claim.unit ?? (claim.value && typeof claim.value === "object" ? claim.value.unit : null) ?? null,
    validFrom: field(claim, "validFrom", "valid_from") ?? null,
    validUntil: field(claim, "validUntil", "valid_until") ?? null,
    modality: claim.modality ?? null,
    conditional: claim.conditional === true,
    polarity: claim.polarity ?? "affirmed",
    status: claim.status ?? "observed",
    attribution: claim.attribution ?? { type: claim.attributionType ?? null, entityId: claim.attributionEntityId ?? null },
    evidence: Array.isArray(claim.evidence) ? claim.evidence : [],
    articleId: field(claim, "articleId", "article_id") ?? null,
    sourceId: field(claim, "sourceId", "source_id") ?? null,
  };
}
function instant(value) { if (value == null) return null; const time = Date.parse(value); return Number.isFinite(time) ? time : null; }
function temporalRelation(a, b) {
  const af = instant(a.validFrom), au = instant(a.validUntil), bf = instant(b.validFrom), bu = instant(b.validUntil);
  if (a.validFrom != null && af == null || a.validUntil != null && au == null || b.validFrom != null && bf == null || b.validUntil != null && bu == null) return { status: "invalid", reason: "temporal_invalid" };
  if (au != null && af != null && au <= af || bu != null && bf != null && bu <= bf) return { status: "invalid", reason: "temporal_invalid" };
  if (af != null && bu != null && af >= bu || bf != null && au != null && bf >= au) return { status: "disjoint", reason: "temporal_non_overlap" };
  return { status: af == null && au == null && bf == null && bu == null ? "unknown" : "overlap", reason: "temporal_overlap" };
}
function valueOf(claim) {
  if (claim.normalizedValue != null) return String(claim.normalizedValue).trim();
  if (claim.value == null) return null;
  if (typeof claim.value === "object") {
    if (claim.value.value != null) return String(claim.value.value).trim();
    if (claim.value.amount != null) return String(claim.value.amount).trim();
    return JSON.stringify(claim.value);
  }
  return String(claim.value).trim();
}
function compareValues(a, b) {
  if (a.claimType === "numeric") {
    const av = Number(valueOf(a)), bv = Number(valueOf(b));
    if (!Number.isFinite(av) || !Number.isFinite(bv)) return { comparable: false, reason: "numeric_invalid" };
    const factors = { m: 1, km: 1000, "million HUF": 1000000, "billion HUF": 1000000000 };
    const unitA = a.unit || null, unitB = b.unit || null;
    const hasFactor = (unit) => Object.prototype.hasOwnProperty.call(factors, unit);
    if (unitA !== unitB && (!hasFactor(unitA) || !hasFactor(unitB) || (String(unitA).includes("HUF") !== String(unitB).includes("HUF")))) return { comparable: false, reason: "unit_mismatch" };
    const left = unitA ? av * (factors[unitA] || 1) : av;
    const right = unitB ? bv * (factors[unitB] || 1) : bv;
    return { comparable: true, different: left !== right, conflictType: "numeric", reason: unitA !== unitB && left === right ? "unit_conversion_equal" : "different_normalized_value" };
  }
  const av = valueOf(a), bv = valueOf(b);
  if (av == null || bv == null) return { comparable: false, reason: "value_missing" };
  if (a.claimType === "text") return { comparable: false, reason: "text_semantic_not_in_scope" };
  return { comparable: true, different: av !== bv, conflictType: a.claimType === "entity" ? "entity_identity" : a.claimType === "relation" ? "relation" : a.claimType === "temporal" ? "temporal" : "categorical" };
}
function fingerprint(a, b, comparison, temporal) {
  const ids = [a.id, b.id].sort((x, y) => x - y);
  return createHash("sha256").update(JSON.stringify({ ids, predicate: a.predicate, type: comparison.conflictType, temporal: temporal.status, version: CONTRACT_VERSIONS.conflictHistory })).digest("hex");
}
function detectConflict(left, right) {
  const a = canonicalClaim(left), b = canonicalClaim(right);
  if (a.id === b.id) return { status: "no_match", reason: "self_reference", claims: [a, b] };
  if (a.subjectEntityId !== b.subjectEntityId || a.predicate !== b.predicate || a.claimType !== b.claimType || !COMPARABLE_TYPES.has(a.claimType)) return { status: "no_match", reason: "scope_or_type_mismatch", claims: [a, b] };
  if ((a.modality === "plan" && b.modality === "completed") || (a.modality === "completed" && b.modality === "plan")) return { status: "no_conflict", reason: "different_event_state", claims: [a, b] };
  const temporal = temporalRelation(a, b);
  if (temporal.status === "invalid") return invalid([temporal.reason]);
  if (temporal.status === "disjoint") return { status: "no_conflict", reason: temporal.reason, claims: [a, b] };
  const comparison = compareValues(a, b);
  if (!comparison.comparable) return { status: "no_conflict", reason: comparison.reason, claims: [a, b] };
  if (!comparison.different) return { status: "no_conflict", reason: comparison.reason === "unit_conversion_equal" ? comparison.reason : "same_normalized_value", claims: [a, b] };
  const conflict = {
    status: "candidate",
    conflictType: comparison.conflictType,
    fingerprint: fingerprint(a, b, comparison, temporal),
    state: "open",
    severity: a.claimType === "boolean" ? "high" : "review",
    scopeType: "entity",
    scopeId: a.subjectEntityId,
    claims: [a, b].sort((x, y) => x.id - y.id),
    temporal: { status: temporal.status, reason: temporal.reason, a: { validFrom: a.validFrom, validUntil: a.validUntil }, b: { validFrom: b.validFrom, validUntil: b.validUntil } },
    comparison: { matcherVersion: CONTRACT_VERSIONS.conflictHistory, reason: "different_normalized_value", unitA: a.unit, unitB: b.unit },
    evidence: [a, b].flatMap((claim) => claim.evidence.map((evidence) => ({ claimId: claim.id, ...evidence }))),
    attribution: [a, b].map((claim) => ({ claimId: claim.id, attribution: claim.attribution })),
    automaticWinner: null,
  };
  return conflict;
}

function validateConflict(input) {
  if (!input || typeof input !== "object") return invalid(["conflict_required"]);
  if (!CONFLICT_TYPES.includes(input.conflictType)) return invalid(["conflict_type_invalid"]);
  if (!/^[a-f0-9]{64}$/.test(String(input.fingerprint))) return invalid(["fingerprint_invalid"]);
  if (typeof input.scopeType !== "string" || !/^[a-z][a-z0-9_]{0,31}$/.test(input.scopeType)) return invalid(["scope_type_invalid"]);
  if (!Number.isSafeInteger(Number(input.scopeId)) || Number(input.scopeId) < 1) return invalid(["scope_id_invalid"]);
  if (typeof input.severity !== "string" || !/^[a-z][a-z0-9_]{0,23}$/.test(input.severity)) return invalid(["severity_invalid"]);
  if (!Array.isArray(input.claims) || input.claims.length < 2) return invalid(["claims_required"]);
  if (input.state !== "open") return invalid(["automatic_resolution_forbidden"]);
  return { status: "valid", result: input };
}

module.exports = { CLAIM_TYPES, CONFLICT_TYPES, canonicalClaim, detectConflict, validateConflict };
