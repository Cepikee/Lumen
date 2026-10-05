"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBenchmarkDataset } = require("../../lib/v22/benchmark-dataset.cjs");
const { buildOraclePredictions } = require("../fixtures/v22-intelligence-benchmark/oracle-predictions.cjs");
const { evaluateDataset, normalizeProviderOutput } = require("../../lib/v22/benchmark-evaluator.cjs");

function datasetAndOracle() {
  const dataset = buildBenchmarkDataset();
  return { dataset, predictions: buildOraclePredictions(dataset) };
}
function scenario(predictions, id) { return predictions.scenarios.find((item) => item.id === id); }
function claim(predictions, id, index = 0) { return scenario(predictions, id).claims[index]; }

 test("oracle provider boundary reaches perfect core semantics", () => {
  const { dataset, predictions } = datasetAndOracle();
  const report = evaluateDataset(dataset, normalizeProviderOutput(predictions));
  assert.equal(report.metrics.entityRecall, 1);
  assert.equal(report.metrics.claimRecall, 1);
  assert.equal(report.metrics.relationRecall, 1);
  assert.equal(report.metrics.eventMatchingAccuracy, 1);
  assert.equal(report.metrics.conflictRecall, 1);
  assert.equal(report.metrics.attributionAccuracy, 1);
  assert.equal(report.metrics.evidenceAccuracy, 1);
  assert.equal(report.metrics.temporalAccuracy, 1);
  assert.equal(report.metrics.negationAccuracy, 1);
  assert.equal(report.metrics.modalityAccuracy, 1);
  assert.equal(report.metrics.sourceOmissionRecall, 1);
  assert.equal(report.metrics.temporalChangeRecall, 1);
  assert.equal(report.metrics.identityAccuracy, 1);
  assert.equal(report.metrics.unsupportedPredictionRate, 0);
  assert.equal(report.falseConflictCount, 0);
  assert.equal(report.detail.scenarios.length, 20);
});

test("mutation: lost negation and conditional modality are detected", () => {
  const { dataset, predictions } = datasetAndOracle();
  claim(predictions, "V22-S08").polarity = "affirmed";
  claim(predictions, "V22-S07").modality = "asserted";
  const report = evaluateDataset(dataset, predictions);
  assert.ok(report.metrics.negationAccuracy < 1);
  assert.ok(report.metrics.modalityAccuracy < 1);
});

test("mutation: wrong attribution and namesake identity are detected", () => {
  const { dataset, predictions } = datasetAndOracle();
  claim(predictions, "V22-S12").attribution = { type: "journalist", label: "a cikk szerzője" };
  const namesake = scenario(predictions, "V22-S14");
  namesake.entities[1].identity = namesake.entities[0].identity;
  const report = evaluateDataset(dataset, predictions);
  assert.ok(report.metrics.attributionAccuracy < 1);
  assert.ok(report.metrics.identityAccuracy < 1);
});

test("mutation: false and missed conflicts are visible", () => {
  const { dataset, predictions } = datasetAndOracle();
  scenario(predictions, "V22-S01").conflicts = [];
  scenario(predictions, "V22-S04").conflicts = [{ type: "numeric", claims: ["telex.hu", "index.hu"] }];
  const report = evaluateDataset(dataset, predictions);
  assert.ok(report.metrics.conflictRecall < 1);
  assert.ok(report.falseConflictCount >= 1);
  assert.ok(report.metrics.falseConflictRate > 0);
});

test("mutation: temporal change and omission status errors are detected", () => {
  const { dataset, predictions } = datasetAndOracle();
  scenario(predictions, "V22-S16").changes = [];
  scenario(predictions, "V22-S17").omissions[0].status = "explicit_unknown";
  const report = evaluateDataset(dataset, predictions);
  assert.ok(report.metrics.temporalChangeRecall < 1);
  assert.ok(report.metrics.sourceOmissionRecall < 1);
});
