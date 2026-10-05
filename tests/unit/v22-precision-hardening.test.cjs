"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBenchmarkDataset } = require("../../lib/v22/benchmark-dataset.cjs");
const semantic = require("../../lib/v2/deterministic-semantic");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { runEntityExtraction } = require("../../lib/v2/runtime-entity-extraction");
const { runClaimExtraction } = require("../../lib/v2/runtime-claim-extraction");
const { createDeterministicEntityProvider } = require("../../lib/v2/entity-extraction-provider");
const { createDeterministicClaimProvider } = require("../../lib/v2/claim-extraction-provider");
const { createDeterministicRelationProvider } = require("../../lib/v2/relation-extraction-provider");
const { runRelationExtraction } = require("../../lib/v2/runtime-relation-extraction");
const { evaluateDataset } = require("../../lib/v22/benchmark-evaluator.cjs");
const { predictArticles } = require("../../lib/v22/deterministic-text-provider.cjs");

test("precision helper abstains on filler and survives twenty perturbed source variants", () => {
  const sources = buildBenchmarkDataset().scenarios.flatMap((scenario) => scenario.sourceVariants).slice(0, 20);
  assert.equal(sources.length, 20);
  for (const source of sources) {
    const paragraphs = source.text.split(/\n\n/gu);
    const variant = paragraphs.reverse().join("\n\n").replace(/\s+/gu, " ").replace(/\s+([,.!?])/gu, "$1").trim();
    const claims = semantic.extractClaims(variant, source.source.key);
    const entities = semantic.extractEntities(variant);
    assert.ok(Array.isArray(claims));
    assert.ok(Array.isArray(entities));
    assert.ok(claims.every((claim) => claim.predicate && claim.predicate !== "TEXT_ASSERTION"));
    assert.ok(claims.every((claim) => variant.includes(claim.evidence)));
    assert.ok(claims.filter((claim) => typeof claim.value === "number").every((claim) => Number.isFinite(claim.value)));
  }
});

test("precision helper distinguishes namesake contexts and preserves semantic qualifiers", () => {
  const text = "Nagy Péter pécsi biológus írta alá a jelentést. Nagy Péter szegedi képviselő cáfolta a hírt. Ha megérkezik a támogatás, megkezdődhet az építés, de nem történt sérülés.";
  const entities = semantic.extractEntities(text);
  assert.ok(entities.some((entity) => entity.mention === "Nagy Péter" && entity.identity === "pécsi"));
  assert.ok(entities.some((entity) => entity.mention === "Nagy Péter" && entity.identity === "szegedi"));
  const claims = semantic.extractClaims(text, "example.hu");
  assert.ok(claims.some((claim) => claim.conditional === true && claim.modality === "conditional"));
  assert.ok(claims.some((claim) => claim.polarity === "negated" && claim.predicate === "INJURY_OCCURRED"));
});

test("deterministic semantic providers satisfy canonical extraction contracts without gold input", async () => {
  const normalized = createIngestionEnvelope({ originalUrl: "https://example.hu/article/1", title: "Kanonikus teszt", content: "A beruházás költsége 12 millió forint. A közlemény szerint nem történt sérülés." });
  assert.equal(normalized.outcome, "normalized");
  const entity = await runEntityExtraction(normalized.envelope, {}, { enabled: true, provider: createDeterministicEntityProvider() });
  assert.equal(entity.status, "completed");
  assert.ok(entity.result.entities.every((item) => normalized.envelope.article.contentText.includes(item.mentionText) || normalized.envelope.article.title.includes(item.mentionText)));
  const claim = await runClaimExtraction({ articleId: 1, sourceId: 1, text: normalized.envelope.article.contentText }, {}, { enabled: true, provider: createDeterministicClaimProvider() });
  assert.equal(claim.status, "completed");
  assert.ok(claim.result.claims.some((item) => item.predicate === "PROJECT_COST"));
  assert.ok(claim.result.claims.every((item) => normalized.envelope.article.contentText.slice(item.evidence.start, item.evidence.end) === item.evidence.textSpan));
  const relation = await runRelationExtraction({ articleId: 1, sourceId: 1, text: "Mészáros dolgozik Acme-nél.", entities: [{ id: 1, mention: "Mészáros" }, { id: 2, mention: "Acme" }] }, {}, { enabled: true, provider: createDeterministicRelationProvider() });
  assert.equal(relation.status, "completed");
  assert.equal(relation.result.relations[0].predicate, "WORKS_FOR");
});

test("semantic helper has no benchmark gold dependency", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync("lib/v2/deterministic-semantic.js", "utf8");
  assert.doesNotMatch(source, /benchmark-dataset|gold-manifest|V22-S\d|expected\s*:/i);
});

test("direct-denial official attribution is source-derived and benchmark-grounded", () => {
  const dataset = buildBenchmarkDataset();
  const scenario = dataset.scenarios.find((item) => item.id === "V22-S08");
  const article = scenario.sourceVariants.find((item) => item.source.key === "telex.hu");
  const expected = scenario.expected.claims.find((item) => item.source === "telex.hu");
  assert.match(article.text, /mentőszolgálat szerint/iu);
  assert.equal(expected.attribution.label, "mentőszolgálat");
  assert.ok(article.text.includes(expected.sentence));
  const predicted = predictArticles({ scenarios: dataset.scenarios }).scenarios.find((item) => item.id === "V22-S08");
  assert.equal(predicted.claims.length, 2);
  assert.ok(predicted.claims.every((claim) => /nem történt sérülés|sérülés nem történt/iu.test(claim.evidence)));
  const report = evaluateDataset(dataset, predictArticles({ scenarios: dataset.scenarios }));
  assert.equal(report.metrics.groundedPredictionRate, 1);
  assert.equal(report.metrics.evidenceAccuracy, 1);
});

test("scenario projection collapses repeated entity mentions but keeps namesake identities", () => {
  const dataset = buildBenchmarkDataset();
  const predictions = predictArticles({ scenarios: dataset.scenarios });
  const repeated = predictions.scenarios.find((item) => item.id === "V22-S01");
  assert.equal(new Set(repeated.entities.map((item) => `${item.normalized}|${item.type}|${item.identity}`)).size, repeated.entities.length);
  const namesakes = predictions.scenarios.find((item) => item.id === "V22-S14").entities.filter((item) => item.mention === "Nagy Péter");
  assert.equal(new Set(namesakes.map((item) => item.identity)).size, 2);
});
