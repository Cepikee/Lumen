"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const CLAIM_TYPES = Object.freeze(["numeric", "categorical", "text", "temporal", "boolean", "entity", "status"]);
const CLAIM_TYPE_SET = new Set(CLAIM_TYPES);
const CLAIM_STATUSES = Object.freeze(["observed", "disputed", "superseded", "retracted", "unresolved"]);
const CLAIM_STATUS_SET = new Set(CLAIM_STATUSES);
const SUPPORT_TYPES = Object.freeze(["support", "contradict", "reported"]);
const SUPPORT_TYPE_SET = new Set(SUPPORT_TYPES);
const ATTRIBUTION_TYPES = Object.freeze(["direct", "reported", "quoted", "unknown"]);
const ATTRIBUTION_SET = new Set(ATTRIBUTION_TYPES);
const POLARITIES = Object.freeze(["affirmed", "negated", "unknown"]);
const POLARITY_SET = new Set(POLARITIES);
const ALLOWED_CLAIM_KEYS = new Set(["subjectEntityId", "predicate", "objectEntityId", "value", "normalizedValue", "claimText", "claimType", "status", "confidence", "supportType", "attributionType", "attributionEntityId", "attribution", "polarity", "uncertainty", "conditional", "modality", "validFrom", "validUntil", "evidence", "isQuestion"]);

function invalid(errors) { return { status: "invalid", errors: Object.freeze([...new Set(errors)]) }; }
function positiveId(value, field) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`);
  return Number(value);
}
function finiteRatio(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new TypeError(`${field}_invalid`);
  return value;
}
function optionalDate(value, field) {
  if (value == null) return null;
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) throw new TypeError(`${field}_invalid`);
  return value;
}
function span(text, candidate, prefix) {
  const evidence = candidate.evidence;
  if (!evidence || !Number.isSafeInteger(evidence.start) || !Number.isSafeInteger(evidence.end) || evidence.start < 0 || evidence.end <= evidence.start || evidence.end > text.length) throw new TypeError(`${prefix}.evidence_span_invalid`);
  if (typeof evidence.textSpan !== "string" || text.slice(evidence.start, evidence.end) !== evidence.textSpan) throw new TypeError(`${prefix}.evidence_span_mismatch`);
  return { start: evidence.start, end: evidence.end, textSpan: evidence.textSpan };
}
function validJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(validJsonValue);
  if (typeof value === "object") return Object.values(value).every(validJsonValue);
  return false;
}

function validateClaimInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["input_invalid"]);
  const errors = [];
  if (typeof input.text !== "string" || !input.text) errors.push("text_required");
  try { positiveId(input.articleId, "article_id"); } catch (error) { errors.push(error.message); }
  if (input.sourceId != null) try { positiveId(input.sourceId, "source_id"); } catch (error) { errors.push(error.message); }
  if (input.extractionRunId != null) try { positiveId(input.extractionRunId, "extraction_run_id"); } catch (error) { errors.push(error.message); }
  return errors.length ? invalid(errors) : { status: "valid" };
}

function validateClaimResult(input, rawResult) {
  const inputValidation = validateClaimInput(input);
  if (inputValidation.status !== "valid") return inputValidation;
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult) || !Array.isArray(rawResult.claims)) return invalid(["claims_must_be_array"]);
  if (rawResult.contractVersion != null && rawResult.contractVersion !== CONTRACT_VERSIONS.extractionSchema) return invalid(["incompatible_extraction_version"]);
  const errors = [];
  const claims = [];
  rawResult.claims.forEach((candidate, index) => {
    const prefix = `claims[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) { errors.push(`${prefix}.invalid`); return; }
    for (const key of Object.keys(candidate)) if (!ALLOWED_CLAIM_KEYS.has(key)) errors.push(`${prefix}.unknown_field:${key}`);
    const claimType = candidate.claimType;
    if (!CLAIM_TYPE_SET.has(claimType)) errors.push(`${prefix}.claim_type_invalid`);
    if (typeof candidate.predicate !== "string" || !/^[A-Z][A-Z0-9_]{0,127}$/.test(candidate.predicate)) errors.push(`${prefix}.predicate_invalid`);
    if (candidate.subjectEntityId != null) try { positiveId(candidate.subjectEntityId, `${prefix}.subject_entity_id`); } catch (error) { errors.push(error.message); }
    if (candidate.objectEntityId != null) try { positiveId(candidate.objectEntityId, `${prefix}.object_entity_id`); } catch (error) { errors.push(error.message); }
    const attribution = candidate.attribution && typeof candidate.attribution === "object" && !Array.isArray(candidate.attribution) ? candidate.attribution : null;
    const attributionType = candidate.attributionType || attribution?.type || "unknown";
    const attributionEntityId = candidate.attributionEntityId ?? attribution?.entityId ?? null;
    if (attributionEntityId != null) try { positiveId(attributionEntityId, `${prefix}.attribution_entity_id`); } catch (error) { errors.push(error.message); }
    try { finiteRatio(candidate.confidence, `${prefix}.confidence`); } catch (error) { errors.push(error.message); }
    if (candidate.status != null && !CLAIM_STATUS_SET.has(candidate.status)) errors.push(`${prefix}.status_invalid`);
    if (candidate.supportType != null && !SUPPORT_TYPE_SET.has(candidate.supportType)) errors.push(`${prefix}.support_type_invalid`);
    if (!ATTRIBUTION_SET.has(attributionType)) errors.push(`${prefix}.attribution_type_invalid`);
    if (candidate.polarity != null && !POLARITY_SET.has(candidate.polarity)) errors.push(`${prefix}.polarity_invalid`);
    if (candidate.uncertainty != null && (typeof candidate.uncertainty !== "boolean")) errors.push(`${prefix}.uncertainty_invalid`);
    if (candidate.conditional != null && typeof candidate.conditional !== "boolean") errors.push(`${prefix}.conditional_invalid`);
    try { optionalDate(candidate.validFrom, `${prefix}.valid_from`); } catch (error) { errors.push(error.message); }
    try { optionalDate(candidate.validUntil, `${prefix}.valid_until`); } catch (error) { errors.push(error.message); }
    if (candidate.value !== undefined && (candidate.value === null || typeof candidate.value === "function" || typeof candidate.value === "undefined")) errors.push(`${prefix}.value_invalid`);
    if (candidate.value !== undefined && !validJsonValue(candidate.value)) errors.push(`${prefix}.value_invalid`);
    if (candidate.normalizedValue != null && (typeof candidate.normalizedValue !== "string" || candidate.normalizedValue.length > 512)) errors.push(`${prefix}.normalized_value_invalid`);
    if (candidate.isQuestion === true) errors.push(`${prefix}.question_not_claim`);
    if (candidate.validFrom && candidate.validUntil && Date.parse(candidate.validFrom) > Date.parse(candidate.validUntil)) errors.push(`${prefix}.valid_interval_invalid`);
    let evidence;
    try { evidence = span(input.text, candidate, prefix); } catch (error) { errors.push(error.message); }
    if (!errors.some((error) => error.startsWith(`${prefix}.`))) {
      claims.push(Object.freeze({
        subjectEntityId: candidate.subjectEntityId == null ? null : Number(candidate.subjectEntityId),
        predicate: candidate.predicate,
        objectEntityId: candidate.objectEntityId == null ? null : Number(candidate.objectEntityId),
        value: candidate.value === undefined ? null : candidate.value,
        normalizedValue: candidate.normalizedValue == null ? null : String(candidate.normalizedValue).slice(0, 512),
        claimType,
        status: candidate.status || "observed",
        confidence: candidate.confidence,
        supportType: candidate.supportType || "support",
        claimText: candidate.claimText == null ? null : String(candidate.claimText),
        attributionType,
        attributionEntityId: attributionEntityId == null ? null : Number(attributionEntityId),
        polarity: candidate.polarity || "affirmed",
        uncertainty: candidate.uncertainty === true,
        conditional: candidate.conditional === true,
        modality: candidate.modality == null ? null : String(candidate.modality).slice(0, 64),
        validFrom: candidate.validFrom || null,
        validUntil: candidate.validUntil || null,
        evidence,
      }));
    }
  });
  return errors.length ? invalid(errors) : Object.freeze({ status: "valid", result: Object.freeze({ contractVersion: CONTRACT_VERSIONS.extractionSchema, claims: Object.freeze(claims) }) });
}

module.exports = { CLAIM_TYPES, CLAIM_STATUSES, SUPPORT_TYPES, ATTRIBUTION_TYPES, POLARITIES, validateClaimInput, validateClaimResult };
