"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildBenchmarkDataset } = require("../lib/v22/benchmark-dataset.cjs");
const { buildDenseBenchmarkDataset } = require("../lib/v22/dense-benchmark-dataset.cjs");
const { emptyPredictions, evaluateDataset } = require("../lib/v22/benchmark-evaluator.cjs");
const { benchmarkIntegrity } = require("../lib/v22/benchmark-integrity.cjs");

function loadPredictions(file) {
  if (!file) return null;
  const parsed = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  return parsed.predictions || parsed;
}

const predictionFile = process.argv.includes("--predictions") ? process.argv[process.argv.indexOf("--predictions") + 1] : null;
const dataset = buildBenchmarkDataset();
const denseDataset = buildDenseBenchmarkDataset();
const supplied = loadPredictions(predictionFile);
const predictions = supplied?.core || supplied;
const densePredictions = supplied?.dense || null;
const report = evaluateDataset(dataset, predictions || emptyPredictions(dataset));
const denseReport = evaluateDataset(denseDataset, densePredictions || emptyPredictions(denseDataset));
const fixtureDir = path.join(__dirname, "../tests/fixtures/v22-intelligence-benchmark");
const outputPath = path.join(__dirname, "../docs/UTOM_V2_2/00_baseline.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ mode: predictionFile ? "supplied_predictions" : "default_mock_empty_provider", source: predictionFile || null, integrity: benchmarkIntegrity({ fixtureDir, provider: "mock", providerConfig: "empty-provider" }), tiers: { core: report, dense: denseReport } }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ mode: predictionFile ? "supplied_predictions" : "default_mock_empty_provider", core: { scenarios: report.scenarioCount, articles: report.articleCount, expected: report.expectedCounts, predicted: report.predictedCounts, metrics: report.metrics, falseConflictCount: report.falseConflictCount }, dense: { scenarios: denseReport.scenarioCount, articles: denseReport.articleCount, expected: denseReport.expectedCounts, predicted: denseReport.predictedCounts, metrics: denseReport.metrics, falseConflictCount: denseReport.falseConflictCount } }));
