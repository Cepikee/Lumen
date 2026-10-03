"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { CONTRACT_VERSIONS } = require("../../lib/v2/contract-versions");
const { validateEntityExtractionInput, validateEntityExtractionResult } = require("../../lib/v2/entity-extraction");

function envelope(item = {}) {
  return createIngestionEnvelope({ originalUrl: "https://example.com/cikk", title: "Mészáros Lőrinc és OTP", content: "Az OTP Bank új projektet jelentett be.", ...item }).envelope;
}

test("M4 validates the canonical ingestion envelope and preserves Hungarian text", () => {
  const input = validateEntityExtractionInput(envelope());
  assert.equal(input.status, "valid");
  assert.match(input.text, /Mészáros Lőrinc/);
  assert.match(input.text, /OTP Bank/);
});

test("M4 rejects incompatible input envelope versions explicitly", () => {
  const value = { ...envelope(), envelopeVersion: "v2.ingestion.999" };
  assert.deepEqual(validateEntityExtractionInput(value), { status: "invalid", errors: ["incompatible_envelope_version"] });
});

test("M4 rejects non-canonical article text instead of stringifying arbitrary objects", () => {
  const value = { ...envelope(), article: { ...envelope().article, contentText: { text: "hallucinated" } } };
  assert.deepEqual(validateEntityExtractionInput(value), { status: "invalid", errors: ["invalid_article_text"] });
});

test("M4 accepts an empty extraction as a valid result", () => {
  const output = validateEntityExtractionResult(envelope(), { entities: [] });
  assert.equal(output.status, "valid");
  assert.deepEqual(output.result.entities, []);
});

test("M4 validates typed mention, confidence and exact evidence span", () => {
  const source = envelope();
  const text = `${source.article.title}\n${source.article.contentText}`;
  const mention = "Mészáros Lőrinc";
  const start = text.indexOf(mention);
  const output = validateEntityExtractionResult(source, { entities: [{ mentionText: mention, normalizedCandidateName: mention, entityType: "person", confidence: 1, evidence: { start, end: start + mention.length } }] });
  assert.equal(output.status, "valid");
  assert.equal(output.result.contractVersion, CONTRACT_VERSIONS.extractionSchema);
  assert.ok(Object.isFrozen(output.result));
  assert.ok(Object.isFrozen(output.result.entities[0]));
});

test("M4 rejects unknown types, bad confidence, hallucinated spans and extra fields", () => {
  const source = envelope();
  const bad = validateEntityExtractionResult(source, { entities: [{ mentionText: "OTP Bank", normalizedCandidateName: "OTP Bank", entityType: "country", confidence: 2, evidence: { start: 999, end: 1000 }, entityId: 7 }] });
  assert.equal(bad.status, "invalid");
  assert.ok(bad.errors.some((error) => error.includes("entityType_invalid")));
  assert.ok(bad.errors.some((error) => error.includes("confidence_invalid")));
  assert.ok(bad.errors.some((error) => error.includes("evidence_span_out_of_range")));
  assert.ok(bad.errors.some((error) => error.includes("unknown_field:entityId")));
});

test("M4 keeps repeated occurrences and same-name candidates separate", () => {
  const source = envelope({ title: "OTP Bank", content: "OTP Bank és OTP Bank." });
  const text = `${source.article.title}\n${source.article.contentText}`;
  const first = text.indexOf("OTP Bank");
  const second = text.indexOf("OTP Bank", first + 1);
  const output = validateEntityExtractionResult(source, { entities: [
    { mentionText: "OTP Bank", normalizedCandidateName: "OTP Bank", entityType: "company", confidence: 0.8, evidence: { start: first, end: first + 8 } },
    { mentionText: "OTP Bank", normalizedCandidateName: "OTP Bank", entityType: "organization", confidence: 0.7, evidence: { start: second, end: second + 8 } },
  ] });
  assert.equal(output.status, "valid");
  assert.equal(output.result.entities.length, 2);
});
