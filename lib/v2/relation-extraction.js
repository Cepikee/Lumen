"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const RELATION_PREDICATES = Object.freeze([
  "OWNS", "WORKS_FOR", "CEO_OF", "LOCATED_IN", "BUILDS", "INVESTS_IN",
  "ACQUIRED", "PARTNER_OF", "SUPPORTS", "OPPOSES", "PARTICIPATES_IN", "RELATED_TO",
]);
const PREDICATE_SET = new Set(RELATION_PREDICATES);
const SUPPORT_TYPES = Object.freeze(["support", "contradict", "reported"]);
const SUPPORT_TYPE_SET = new Set(SUPPORT_TYPES);

function positiveId(value, field) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`);
  return Number(value);
}

function confidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new TypeError("confidence_invalid");
  return value;
}

function validateRelationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { status: "invalid", errors: ["input_invalid"] };
  const errors = [];
  if (typeof input.text !== "string" || !input.text) errors.push("text_required");
  try { positiveId(input.articleId, "article_id"); } catch (error) { errors.push(error.message); }
  if (input.sourceId != null) try { positiveId(input.sourceId, "source_id"); } catch (error) { errors.push(error.message); }
  if (input.extractionRunId != null) try { positiveId(input.extractionRunId, "extraction_run_id"); } catch (error) { errors.push(error.message); }
  return errors.length ? { status: "invalid", errors } : { status: "valid" };
}

function validateRelationResult(input, rawResult) {
  const inputValidation = validateRelationInput(input);
  if (inputValidation.status !== "valid") return inputValidation;
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult) || !Array.isArray(rawResult.relations)) return { status: "invalid", errors: ["relations_must_be_array"] };
  const text = input.text;
  const errors = [];
  const relations = [];
  rawResult.relations.forEach((candidate, index) => {
    const prefix = `relations[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) { errors.push(`${prefix}.invalid`); return; }
    let subjectEntityId;
    let objectEntityId;
    try { subjectEntityId = positiveId(candidate.subjectEntityId, `${prefix}.subject_entity_id`); } catch (error) { errors.push(error.message); }
    try { objectEntityId = positiveId(candidate.objectEntityId, `${prefix}.object_entity_id`); } catch (error) { errors.push(error.message); }
    if (!PREDICATE_SET.has(candidate.predicate)) errors.push(`${prefix}.predicate_invalid`);
    try { confidence(candidate.confidence); } catch (error) { errors.push(`${prefix}.${error.message}`); }
    const evidence = candidate.evidence;
    if (!evidence || !Number.isSafeInteger(evidence.start) || !Number.isSafeInteger(evidence.end) || evidence.start < 0 || evidence.end <= evidence.start || evidence.end > text.length) {
      errors.push(`${prefix}.evidence_span_invalid`);
    } else if (text.slice(evidence.start, evidence.end) !== evidence.textSpan) {
      errors.push(`${prefix}.evidence_span_mismatch`);
    }
    const supportType = candidate.supportType || "support";
    if (!SUPPORT_TYPE_SET.has(supportType)) errors.push(`${prefix}.support_type_invalid`);
    if (!errors.some((error) => error.startsWith(`${prefix}.`))) {
      relations.push(Object.freeze({
        subjectEntityId, predicate: candidate.predicate, objectEntityId,
        confidence: candidate.confidence, supportType,
        validFrom: candidate.validFrom || null, validUntil: candidate.validUntil || null,
        evidence: Object.freeze({ start: evidence.start, end: evidence.end, textSpan: evidence.textSpan }),
      }));
    }
  });
  if (errors.length) return { status: "invalid", errors: [...new Set(errors)] };
  return Object.freeze({ status: "valid", result: Object.freeze({ contractVersion: CONTRACT_VERSIONS.resolver, relations: Object.freeze(relations) }) });
}

module.exports = { PREDICATE_SET, RELATION_PREDICATES, SUPPORT_TYPES, validateRelationInput, validateRelationResult };
