"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBenchmarkDataset } = require("../../lib/v22/benchmark-dataset.cjs");
const { buildDenseBenchmarkDataset } = require("../../lib/v22/dense-benchmark-dataset.cjs");
const semantic = require("../../lib/v2/deterministic-semantic");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { runEntityExtraction } = require("../../lib/v2/runtime-entity-extraction");
const { runClaimExtraction } = require("../../lib/v2/runtime-claim-extraction");
const { createDeterministicEntityProvider } = require("../../lib/v2/entity-extraction-provider");
const { createDeterministicClaimProvider } = require("../../lib/v2/claim-extraction-provider");
const { createDeterministicRelationProvider } = require("../../lib/v2/relation-extraction-provider");
const { runRelationExtraction } = require("../../lib/v2/runtime-relation-extraction");
const { evaluateDataset, claimKey, supportedClaim } = require("../../lib/v22/benchmark-evaluator.cjs");
const { predictArticles } = require("../../lib/v22/deterministic-text-provider.cjs");
const { buildHeldoutDataset } = require("../../lib/v22/heldout-generalization-dataset.cjs");

test("precision helper abstains on filler and survives thirty perturbed source variants", () => {
  const sources = buildBenchmarkDataset().scenarios.flatMap((scenario) => scenario.sourceVariants).slice(0, 30);
  assert.equal(sources.length, 30);
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
  assert.equal(relation.result.relations.length, 1);
  assert.equal(relation.result.relations[0].predicate, "WORKS_FOR");
});

test("explicit organization relation evidence keeps original article offsets", () => {
  const text = "Alföldi Energia Zrt. bejelentette a hálózati próbát.";
  const entities = [
    { id: 1, mention: "Alföldi Energia Zrt" },
    { id: 2, mention: "hálózati próbát" },
  ];
  const relations = semantic.extractRelations(text, entities);
  assert.equal(relations.length, 1);
  assert.equal(relations[0].predicate, "ANNOUNCED");
  assert.equal(text.slice(relations[0].evidence.start, relations[0].evidence.end), relations[0].evidence.textSpan);
  assert.match(relations[0].evidence.textSpan, /bejelentette a hálózati próbát/iu);
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

test("cross-source projection emits only explicit temporal changes and omissions", () => {
  const dataset = buildBenchmarkDataset();
  const predictions = predictArticles({ scenarios: dataset.scenarios });
  const changed = predictions.scenarios.find((item) => item.id === "V22-S16");
  assert.deepEqual(changed.changes, [{ from: "2027-03", to: "2027-06" }]);
  const omitted = predictions.scenarios.find((item) => item.id === "V22-S17");
  assert.deepEqual(omitted.omissions, [{ source: "index.hu", predicate: "GRANT_AMOUNT" }]);
});

test("dense temporal gold values are source-derived and projected deterministically", () => {
  const dataset = buildDenseBenchmarkDataset();
  const predictions = predictArticles({ scenarios: dataset.scenarios });
  for (const scenario of dataset.scenarios) {
    const expected = scenario.expected.changesOverTime[0];
    const sourceText = scenario.sourceVariants.slice(0, 2).map((variant) => variant.text).join(" ");
    const months = { "01": "január", "02": "február", "03": "március", "04": "április", "05": "május", "06": "június", "07": "július", "08": "augusztus", "09": "szeptember", "10": "október", "11": "november", "12": "december" };
    for (const value of [expected.from, expected.to]) {
      const textValue = String(value);
      const dateMatch = textValue.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/u);
      const needle = dateMatch ? `${dateMatch[1]} ${months[dateMatch[2]]}` : textValue;
      assert.ok(sourceText.includes(needle), `${scenario.id} change value is not source-derived: ${value}`);
    }
    const actual = predictions.scenarios.find((item) => item.id === scenario.id).changes;
    assert.deepEqual(actual, [{ from: expected.from, to: expected.to }]);
  }
});

test("evaluator normalizes an omitted date unit to the canonical date semantic", () => {
  const dataset = buildBenchmarkDataset();
  const expected = dataset.scenarios.find((item) => item.id === "V22-S16").expected.claims[0];
  const predicted = { ...expected, unit: "date", __scenarioId: "V22-S16" };
  assert.equal(claimKey({ ...expected, __scenarioId: "V22-S16" }), claimKey(predicted));
});

test("assessment predicates require a local expert proposition", () => {
  assert.equal(semantic.extractClaims("A mérnöki dokumentum méteres mértéket használ.", "example.hu").length, 0);
  const claims = semantic.extractClaims("Kiss Júlia mérnök szerint a partfal állapota megfelelő.", "example.hu");
  assert.ok(claims.some((claim) => claim.predicate === "ENGINEER_ASSESSMENT"));
});

test("evidence-backed categorical claims count as semantically supported", () => {
  assert.equal(supportedClaim({ predicate: "OPENING_EVENT", value: null, evidence: "bejelentette a programot" }), true);
  assert.equal(supportedClaim({ predicate: "UNSPECIFIED_CLAIM", value: null, evidence: "szöveg" }), false);
  assert.equal(supportedClaim({ predicate: "OPENING_EVENT", value: null }), false);
});

test("round 3 recovers explicit relations, separate events, and validated conflicts", () => {
  const dataset = buildBenchmarkDataset();
  const report = evaluateDataset(dataset, predictArticles({ scenarios: dataset.scenarios }));
  assert.equal(report.metrics.relationRecall, 1);
  assert.equal(report.metrics.eventMatchingAccuracy, 1);
  assert.equal(report.metrics.conflictRecall, 1);
  assert.equal(report.metrics.falseConflictRate, 0);
  assert.equal(report.metrics.trulyUnsupportedPredictionRate, 0);
  const multi = predictArticles({ scenarios: dataset.scenarios }).scenarios.find((item) => item.id === "V22-S20");
  assert.deepEqual(multi.events.map((item) => item.title), ["Programbejelentés", "Próbaüzem indulása"]);
});

test("round 3 dense gold values remain source-derived and expose critical coverage", () => {
  const dataset = buildDenseBenchmarkDataset();
  for (const scenario of dataset.scenarios) {
    for (const claim of scenario.expected.claims) {
      const source = scenario.sourceVariants.find((variant) => variant.source.key === claim.source);
      assert.ok(source?.text.includes(claim.sentence), `${scenario.id} claim is not source-derived`);
      assert.ok(["critical", "supporting", "minor"].includes(claim.importance));
    }
  }
  const report = evaluateDataset(dataset, predictArticles({ scenarios: dataset.scenarios }));
  assert.ok(report.metrics.informationCoverageScore > 0.6);
  assert.ok(report.metrics.criticalFactRecall > 0.6);
});

test("round 3 held-out role clauses resolve the longest organisation and preserve separate events", () => {
  const dataset = buildHeldoutDataset();
  const predictions = predictArticles({ scenarios: dataset.scenarios }).scenarios;
  const acquisition = predictions.find((item) => item.id === "H02");
  assert.ok(acquisition.relations.some((relation) => relation.subject === "Kelemen Áron" && relation.predicate === "CEO_OF" && relation.object === "Vektor Holding"));
  const festival = predictions.find((item) => item.id === "H05");
  assert.deepEqual(festival.events.map((event) => event.title), ["Tófutás rajtja", "Gálameccs törlése"]);
  const historical = predictions.find((item) => item.id === "H08");
  assert.equal(historical.conflicts.length, 0);
});
