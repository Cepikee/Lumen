"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildHeldoutDataset } = require("../lib/v22/heldout-generalization-dataset.cjs");
const { predictArticles } = require("../lib/v22/deterministic-text-provider.cjs");
const { evaluateDataset } = require("../lib/v22/benchmark-evaluator.cjs");

function list(value) { return Array.isArray(value) ? value : []; }
function sourceText(dataset) { return dataset.scenarios.flatMap((scenario) => scenario.sourceVariants.map((article) => ({ scenario, article }))); }
function occurrence(text, needle) { return typeof needle === "string" && needle.length > 0 && text.toLocaleLowerCase("hu").includes(needle.toLocaleLowerCase("hu")); }
function derivability(dataset) {
  const rows = [];
  for (const scenario of dataset.scenarios) {
    const articles = scenario.sourceVariants;
    const joined = articles.map((article) => `${article.title}\n${article.text}`).join("\n");
    for (const item of list(scenario.expected.entities)) rows.push({ scenario: scenario.id, field: "entity", value: item.mention, derived: occurrence(joined, item.evidence || item.mention) });
    for (const item of list(scenario.expected.claims)) rows.push({ scenario: scenario.id, field: "claim", source: item.source, value: item.value, derived: occurrence(scenario.sourceVariants.find((article) => article.source.key === item.source)?.text || "", item.evidence || item.sentence) });
    for (const item of list(scenario.expected.relations)) rows.push({ scenario: scenario.id, field: "relation", value: `${item.subject}|${item.predicate}|${item.object}`, derived: occurrence(joined, item.evidence) });
    for (const item of list(scenario.expected.events)) rows.push({ scenario: scenario.id, field: "event", value: item.title, derived: occurrence(joined, item.evidence || item.title) });
  }
  return { total: rows.length, derived: rows.filter((row) => row.derived).length, failed: rows.filter((row) => !row.derived), rows };
}
function duplicateRate(predictions) {
  const rows = [];
  for (const scenario of list(predictions.scenarios)) {
    for (const field of ["entities", "relations", "claims", "events"]) {
      const values = list(scenario[field]);
      const key = (item) => field === "entities" ? `${item.normalized || item.mention}|${item.type}|${item.identity}`
        : field === "relations" ? `${item.subject || item.subjectEntityId}|${item.predicate}|${item.object || item.objectEntityId}`
          : field === "claims" ? `${item.source}|${item.predicate}|${JSON.stringify(item.value ?? item.normalizedValue)}|${item.unit || ""}|${item.evidence || ""}`
            : `${item.title || item.id}`;
      const seen = new Set();
      for (const item of values) { const identity = key(item); if (seen.has(identity)) rows.push({ scenario: scenario.id, field, identity }); else seen.add(identity); }
    }
  }
  return { duplicates: rows.length, predictions: list(predictions.scenarios).reduce((sum, scenario) => sum + ["entities", "relations", "claims", "events"].reduce((inner, field) => inner + list(scenario[field]).length, 0), 0), rows };
}
function main() {
  const dataset = buildHeldoutDataset();
  const predictions = predictArticles({ scenarios: dataset.scenarios });
  const report = evaluateDataset(dataset, predictions);
  const derivabilityReport = derivability(dataset);
  const duplicateReport = duplicateRate(predictions);
  const output = {
    dataset: { version: dataset.benchmarkVersion, scenarios: dataset.scenarios.length, articles: sourceText(dataset).length, expectedEntities: dataset.scenarios.reduce((n, item) => n + list(item.expected.entities).length, 0), expectedRelations: dataset.scenarios.reduce((n, item) => n + list(item.expected.relations).length, 0), expectedClaims: dataset.scenarios.reduce((n, item) => n + list(item.expected.claims).length, 0), expectedEvents: dataset.scenarios.reduce((n, item) => n + list(item.expected.events).length, 0), expectedConflicts: dataset.scenarios.reduce((n, item) => n + list(item.expected.conflicts).length, 0), expectedTemporalChanges: dataset.scenarios.reduce((n, item) => n + list(item.expected.changesOverTime).length, 0), expectedOmissions: dataset.scenarios.reduce((n, item) => n + list(item.expected.omissions).length, 0) },
    derivability: derivabilityReport,
    duplicateProjection: duplicateReport,
    metrics: report.metrics,
    detail: report.detail,
  };
  const outputPath = path.join(__dirname, "../docs/UTOM_V2_2/15_heldout_after_generalization.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, dataset: output.dataset, derivability: { total: derivabilityReport.total, derived: derivabilityReport.derived, failed: derivabilityReport.failed.length }, metrics: report.metrics, duplicateProjection: duplicateReport }));
}
main();
