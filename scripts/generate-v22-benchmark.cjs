"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildBenchmarkDataset } = require("../lib/v22/benchmark-dataset.cjs");
const { buildDenseBenchmarkDataset } = require("../lib/v22/dense-benchmark-dataset.cjs");

const outputDir = path.join(__dirname, "../tests/fixtures/v22-intelligence-benchmark");
const dataset = buildBenchmarkDataset();
const denseDataset = buildDenseBenchmarkDataset();
const manifest = {
  benchmarkVersion: dataset.benchmarkVersion,
  contractVersion: dataset.contractVersion,
  generatedBy: dataset.generatedBy,
  sourcePolicy: dataset.sourcePolicy,
  scenarios: dataset.scenarios.map((scenario) => ({
    id: scenario.id,
    slug: scenario.slug,
    category: scenario.category,
    title: scenario.title,
    sourceVariants: scenario.sourceVariants.map((source) => ({ source: source.source, title: source.title, url: source.url, wordCount: source.wordCount, observationIds: source.observations.map((item) => item.id) })),
  expected: scenario.expected,
  })),
  denseScenarios: denseDataset.scenarios.map((scenario) => ({
    id: scenario.id,
    slug: scenario.slug,
    category: scenario.category,
    title: scenario.title,
    sourceVariants: scenario.sourceVariants.map((source) => ({ source: source.source, title: source.title, url: source.url, wordCount: source.wordCount, observationIds: source.observations.map((item) => item.id) })),
    expected: scenario.expected,
  })),
};
const articles = {
  benchmarkVersion: dataset.benchmarkVersion,
  contractVersion: dataset.contractVersion,
  scenarios: dataset.scenarios.map((scenario) => ({ id: scenario.id, sourceVariants: scenario.sourceVariants.map((source) => ({ source: source.source, title: source.title, url: source.url, wordCount: source.wordCount, text: source.text })) })),
  denseScenarios: denseDataset.scenarios.map((scenario) => ({ id: scenario.id, sourceVariants: scenario.sourceVariants.map((source) => ({ source: source.source, title: source.title, url: source.url, wordCount: source.wordCount, text: source.text })) })),
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "gold-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "articles.json"), `${JSON.stringify(articles, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ scenarios: dataset.scenarios.length, denseScenarios: denseDataset.scenarios.length, articleCount: articles.scenarios.reduce((count, scenario) => count + scenario.sourceVariants.length, 0), denseArticleCount: articles.denseScenarios.reduce((count, scenario) => count + scenario.sourceVariants.length, 0), manifest: path.join(outputDir, "gold-manifest.json"), articlesPath: path.join(outputDir, "articles.json") }));
