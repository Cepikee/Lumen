"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const ENTITY_TYPES = Object.freeze([
  "person",
  "company",
  "organization",
  "location",
  "project",
  "product",
  "topic",
]);
const ENTITY_TYPE_SET = new Set(ENTITY_TYPES);
const ALLOWED_ENTITY_KEYS = new Set(["mentionText", "normalizedCandidateName", "entityType", "confidence", "evidence"]);
const ALLOWED_RESULT_KEYS = new Set(["contractVersion", "entities"]);

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function invalid(errors) {
  return { status: "invalid", errors: Object.freeze([...new Set(errors)]) };
}

function canonicalText(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) return null;
  if (envelope.envelopeVersion !== CONTRACT_VERSIONS.ingestionEnvelope) return null;
  const article = envelope.article;
  if (!article || typeof article !== "object" || Array.isArray(article)) return null;
  const title = article.title == null ? "" : String(article.title);
  const content = article.contentText == null ? "" : String(article.contentText);
  return [title, content].filter(Boolean).join("\n");
}

function validateEntityExtractionInput(envelope) {
  const text = canonicalText(envelope);
  if (envelope == null || typeof envelope !== "object" || Array.isArray(envelope)) return invalid(["invalid_envelope"]);
  if (envelope.envelopeVersion !== CONTRACT_VERSIONS.ingestionEnvelope) return invalid(["incompatible_envelope_version"]);
  if (!envelope.article || typeof envelope.article !== "object" || Array.isArray(envelope.article)) return invalid(["invalid_article"]);
  if (typeof envelope.article.canonicalUrl !== "string" || !envelope.article.canonicalUrl.trim() || typeof envelope.article.urlIdentity !== "string" || !envelope.article.urlIdentity.trim()) return invalid(["missing_article_identity"]);
  if ((envelope.article.title != null && typeof envelope.article.title !== "string") || (envelope.article.contentText != null && typeof envelope.article.contentText !== "string")) return invalid(["invalid_article_text"]);
  return { status: "valid", text };
}

function validateEntityExtractionResult(envelope, rawResult) {
  const input = validateEntityExtractionInput(envelope);
  if (input.status !== "valid") return input;
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) return invalid(["invalid_extraction_result"]);
  if (Object.prototype.hasOwnProperty.call(rawResult, "contractVersion") && rawResult.contractVersion !== CONTRACT_VERSIONS.extractionSchema) {
    return invalid(["incompatible_extraction_version"]);
  }
  const resultKeys = Object.keys(rawResult).filter((key) => !ALLOWED_RESULT_KEYS.has(key));
  if (resultKeys.length) return invalid(resultKeys.map((key) => `unknown_result_field:${key}`));
  if (!Array.isArray(rawResult.entities)) return invalid(["entities_must_be_array"]);

  const errors = [];
  const entities = [];
  for (let index = 0; index < rawResult.entities.length; index += 1) {
    const candidate = rawResult.entities[index];
    const prefix = `entities[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      errors.push(`${prefix}.invalid`);
      continue;
    }
    for (const key of Object.keys(candidate)) if (!ALLOWED_ENTITY_KEYS.has(key)) errors.push(`${prefix}.unknown_field:${key}`);
    const mentionText = typeof candidate.mentionText === "string" ? candidate.mentionText.normalize("NFC") : "";
    const normalizedCandidateName = typeof candidate.normalizedCandidateName === "string"
      ? candidate.normalizedCandidateName.normalize("NFC").trim()
      : "";
    if (!mentionText.trim()) errors.push(`${prefix}.mentionText_required`);
    if (!normalizedCandidateName) errors.push(`${prefix}.normalizedCandidateName_required`);
    if (!ENTITY_TYPE_SET.has(candidate.entityType)) errors.push(`${prefix}.entityType_invalid`);
    if (typeof candidate.confidence !== "number" || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
      errors.push(`${prefix}.confidence_invalid`);
    }
    const span = candidate.evidence;
    if (!span || typeof span !== "object" || Array.isArray(span) || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end)) {
      errors.push(`${prefix}.evidence_span_invalid`);
      continue;
    }
    if (span.start < 0 || span.end <= span.start || span.end > input.text.length) {
      errors.push(`${prefix}.evidence_span_out_of_range`);
      continue;
    }
    if (input.text.slice(span.start, span.end) !== mentionText) errors.push(`${prefix}.evidence_span_mismatch`);
    entities.push({ mentionText, normalizedCandidateName, entityType: candidate.entityType, confidence: candidate.confidence, evidence: { start: span.start, end: span.end } });
  }
  if (errors.length) return invalid(errors);
  return {
    status: "valid",
    result: freeze({
      contractVersion: CONTRACT_VERSIONS.extractionSchema,
      inputEnvelopeVersion: envelope.envelopeVersion,
      article: { canonicalUrl: envelope.article.canonicalUrl, urlIdentity: envelope.article.urlIdentity },
      entities,
    }),
  };
}

module.exports = { ENTITY_TYPES, canonicalText, validateEntityExtractionInput, validateEntityExtractionResult };
