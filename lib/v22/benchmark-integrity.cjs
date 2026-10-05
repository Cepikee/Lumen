"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const BENCHMARK_VERSION = "v22.benchmark.1";
const EVALUATOR_VERSION = "v22.evaluator.3";
const PROVIDER_VERSION = "deterministic-text-v1";

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function benchmarkIntegrity({ fixtureDir, provider = PROVIDER_VERSION, providerConfig = "gold-independent-semantic-helper-round2" }) {
  return {
    benchmarkVersion: BENCHMARK_VERSION,
    articlesHash: sha256File(`${fixtureDir}/articles.json`),
    goldManifestHash: sha256File(`${fixtureDir}/gold-manifest.json`),
    evaluatorVersion: EVALUATOR_VERSION,
    provider: { name: provider, config: providerConfig },
  };
}

module.exports = { BENCHMARK_VERSION, EVALUATOR_VERSION, PROVIDER_VERSION, benchmarkIntegrity, sha256File };
