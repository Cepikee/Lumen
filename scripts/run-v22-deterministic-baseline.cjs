"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildBenchmarkDataset } = require("../lib/v22/benchmark-dataset.cjs");
const { buildDenseBenchmarkDataset } = require("../lib/v22/dense-benchmark-dataset.cjs");
const { predictArticles } = require("../lib/v22/deterministic-text-provider.cjs");
const { evaluateDataset } = require("../lib/v22/benchmark-evaluator.cjs");

const fixturePath = path.join(__dirname, "../tests/fixtures/v22-intelligence-benchmark/articles.json");
const articles = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const coreDataset = buildBenchmarkDataset();
const denseDataset = buildDenseBenchmarkDataset();
const corePredictions = predictArticles({ scenarios: articles.scenarios });
const densePredictions = predictArticles({ scenarios: articles.denseScenarios });
const report = { provider: "deterministic-text-v1", source: fixturePath, core: evaluateDataset(coreDataset, corePredictions), dense: evaluateDataset(denseDataset, densePredictions) };
const outputPath = path.join(__dirname, "../docs/UTOM_V2_2/10_deterministic_baseline.json");
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ provider: report.provider, core: report.core.metrics, dense: report.dense.metrics, outputPath }));
