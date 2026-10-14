"use strict";
const fs=require('node:fs');
const {buildBenchmarkDataset}=require('../../lib/v22/benchmark-dataset.cjs');
const {buildDenseBenchmarkDataset}=require('../../lib/v22/dense-benchmark-dataset.cjs');
const {buildHeldoutDataset}=require('../../lib/v22/heldout-generalization-dataset.cjs');
const {predictArticles}=require('../../lib/v22/deterministic-text-provider.cjs');
const {evaluateDataset}=require('../../lib/v22/benchmark-evaluator.cjs');
const articles=require('../../tests/fixtures/v22-intelligence-benchmark/articles.json');
const oldCore=require('../../docs/UTOM_V2_2/10_deterministic_baseline.json');
const oldHeldout=require('../../docs/UTOM_V2_2/15_heldout_after_generalization.json');
const heldout=buildHeldoutDataset();
// Strip expected labels before the predictor receives historical raw articles.
const sources=heldout.scenarios.map(({id,sourceVariants})=>({id,sourceVariants}));
const report={core:evaluateDataset(buildBenchmarkDataset(),predictArticles({scenarios:articles.scenarios})),dense:evaluateDataset(buildDenseBenchmarkDataset(),predictArticles({scenarios:articles.denseScenarios})),heldout:evaluateDataset(heldout,predictArticles({scenarios:sources}))};
report.metricEquality={core:JSON.stringify(report.core.metrics)===JSON.stringify(oldCore.core.metrics),dense:JSON.stringify(report.dense.metrics)===JSON.stringify(oldCore.dense.metrics),heldout:JSON.stringify(report.heldout.metrics)===JSON.stringify(oldHeldout.metrics)};
fs.writeFileSync('docs/UTOM_V2_2/morph_clause/06_historical_regression.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(report.metricEquality);if(Object.values(report.metricEquality).some(v=>!v))process.exitCode=1;
