"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildBenchmarkDataset } = require("../../lib/v22/benchmark-dataset.cjs");
const { buildDenseBenchmarkDataset } = require("../../lib/v22/dense-benchmark-dataset.cjs");
const { emptyPredictions, evaluateDataset } = require("../../lib/v22/benchmark-evaluator.cjs");

const REQUIRED = [
  "numeric disagreement", "same number, different semantic meaning", "percentage disagreement", "unit conversion", "date/time disagreement",
  "plan vs completed event", "conditional future statement", "direct denial", "partial denial", "uncertain claim", "anonymous attribution",
  "official attribution", "quote vs journalist statement", "entity namesake", "entity type ambiguity", "changed plan over time",
  "source omission", "common fact + source-specific detail", "corrected information", "multi-event article",
];

test("V2.2 benchmark contains 20 mandatory Hungarian scenarios and 2-4 source variants", () => {
  const dataset = buildBenchmarkDataset();
  assert.equal(dataset.scenarios.length, 20);
  assert.deepEqual(dataset.scenarios.map((scenario) => scenario.category), REQUIRED);
  for (const scenario of dataset.scenarios) {
    assert.ok(scenario.sourceVariants.length >= 2 && scenario.sourceVariants.length <= 4);
    for (const source of scenario.sourceVariants) {
      assert.ok(source.wordCount >= 500 && source.wordCount <= 1200);
      assert.ok(source.text.includes(source.title.split(" – ")[0]));
      for (const claim of source.observations) {
        assert.ok(claim.predicate);
        assert.ok(source.text.includes(claim.evidence));
      }
    }
  }
});

test("V2.2 gold manifest covers evidence-first dimensions without direct DB writes", () => {
  const datasetSource = fs.readFileSync(path.join(__dirname, "../../lib/v22/benchmark-dataset.cjs"), "utf8");
  assert.doesNotMatch(datasetSource, /INSERT\s+INTO\s+v2_/i);
  const dataset = buildBenchmarkDataset();
  for (const scenario of dataset.scenarios) {
    assert.ok(Array.isArray(scenario.expected.entities));
    assert.ok(Array.isArray(scenario.expected.claims));
    assert.ok(Array.isArray(scenario.expected.conflicts));
    assert.ok(Array.isArray(scenario.expected.nonConflicts));
    assert.ok(Array.isArray(scenario.expected.omissions));
    assert.ok(Array.isArray(scenario.expected.changesOverTime));
  }
});

test("V2.2 baseline makes empty-provider gap explicit and reproducible", () => {
  const dataset = buildBenchmarkDataset();
  const report = evaluateDataset(dataset, emptyPredictions(dataset));
  assert.equal(report.scenarioCount, 20);
  assert.ok(report.articleCount >= 40);
  assert.equal(report.detail.claim.expected, report.expectedCounts.claims);
  assert.equal(report.detail.entity.expected, report.expectedCounts.entities);
  assert.equal(report.predictedCounts.claims, 0);
  assert.equal(report.metrics.claimRecall, 0);
  assert.equal(report.metrics.negationAccuracy, null);
  assert.equal(report.falseConflictCount, 0);
});

test("V2.2 dense tier contains five three-source scenarios with broad observations", () => {
  const dataset = buildDenseBenchmarkDataset();
  assert.equal(dataset.scenarios.length, 5);
  for (const scenario of dataset.scenarios) {
    assert.equal(scenario.sourceVariants.length, 3);
    assert.ok(scenario.expected.entities.length >= 4 && scenario.expected.entities.length <= 10);
    assert.ok(scenario.expected.relations.length >= 1);
    assert.ok(scenario.expected.changesOverTime.length >= 1);
    assert.ok(scenario.expected.omissions.length >= 1);
    for (const source of scenario.sourceVariants) {
      assert.ok(source.wordCount >= 700 && source.wordCount <= 1200);
      assert.ok(source.observations.length >= 8 && source.observations.length <= 20);
      assert.ok(source.text.includes(source.observations[0].evidence));
    }
    const omittedSource = scenario.expected.omissions[0].source;
    const omittedPredicate = scenario.expected.omissions[0].predicate;
    const omittedVariant = scenario.sourceVariants.find((source) => source.source.key === omittedSource);
    if (omittedVariant) assert.equal(omittedVariant.observations.some((item) => item.predicate === omittedPredicate), false);
  }
});
