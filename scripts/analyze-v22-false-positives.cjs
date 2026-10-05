"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildBenchmarkDataset } = require("../lib/v22/benchmark-dataset.cjs");
const { buildDenseBenchmarkDataset } = require("../lib/v22/dense-benchmark-dataset.cjs");
const { predictArticles } = require("../lib/v22/deterministic-text-provider.cjs");
const { claimKey, entityKey, relationKey, eventKey, conflictKey, changeKey, omissionKey } = require("../lib/v22/benchmark-evaluator.cjs");

function text(value) { return String(value == null ? "" : value); }
function evidenceCompatible(expected, actual) {
  const left = text(expected?.evidence || expected?.evidenceText || expected?.text).toLowerCase();
  const right = text(actual?.evidence || actual?.evidenceText || actual?.text).toLowerCase();
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}
function scenarioVariants(dataset, scenarioId, source) {
  const scenario = dataset.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return [];
  const requested = text(source).toLowerCase();
  const variants = (scenario.sourceVariants || []).filter((item) => !requested || text(item.source?.key || item.source).toLowerCase() === requested);
  return (variants.length ? variants : scenario.sourceVariants || []).map((item) => text(item.text));
}
function evidenceText(item, field) {
  if (field === "entities") return text(item.mention || item.normalized);
  if (field === "relations") return typeof item.evidence === "string" ? item.evidence : item.evidence?.textSpan;
  return item.evidence || item.evidenceText || item.text || item.explanation;
}
function predictionGrounded(dataset, scenarioId, source, item, field) {
  const needle = text(evidenceText(item, field)).trim().toLocaleLowerCase("hu");
  return Boolean(needle && scenarioVariants(dataset, scenarioId, source).some((sourceText) => sourceText.toLocaleLowerCase("hu").includes(needle)));
}
function semanticMatch(expected, item, field) {
  if (field === "claims") {
    return expected.some((candidate) => text(candidate.source).toLowerCase() === text(item.source).toLowerCase()
      && text(candidate.predicate).toLowerCase() === text(item.predicate).toLowerCase()
      && JSON.stringify(candidate.value) === JSON.stringify(item.value)
      && text(candidate.unit).toLowerCase() === text(item.unit).toLowerCase()
      && (!candidate.subject || !item.subject || text(candidate.subject).toLowerCase() === text(item.subject).toLowerCase()));
  }
  if (field === "entities") return expected.some((candidate) => text(candidate.normalized || candidate.mention).toLowerCase() === text(item.normalized || item.mention).toLowerCase());
  return false;
}
function classifyIntegrity({ dataset, scenarioId, field, item, expected, duplicate }) {
  if (duplicate) return { classification: "DUPLICATE", reason: "same canonical prediction identity is emitted more than once in the scenario" };
  if (!predictionGrounded(dataset, scenarioId, item.source, item, field)) return { classification: "TRUE_UNSUPPORTED", reason: "prediction evidence/mention is not an exact substring of the selected source text" };
  if (semanticMatch(expected, item, field)) return { classification: "EVALUATOR_MISMATCH", reason: "source-grounded prediction shares canonical semantic fields with a gold observation but did not match evaluator evidence normalization" };
  if (field === "entities" && expected.some((candidate) => text(candidate.normalized || candidate.mention).toLowerCase() === text(item.normalized || item.mention).toLowerCase() && text(candidate.type).toLowerCase() !== text(item.type).toLowerCase())) {
    return { classification: "SEMANTIC_MISMATCH", reason: "grounded entity has the expected mention but a different entity type" };
  }
  return { classification: "SUPPORTED_BUT_NOT_IN_GOLD", reason: "source-grounded prediction has no matching gold observation" };
}
function category(item, field) {
  if (field === "entities") {
    if (/^(?:a|az|egy)\b/iu.test(item.mention || "")) return "common_noun_entity";
    if ((item.identity || "") !== "same") return "namesake_or_context_identity";
    return "entity_overgeneration";
  }
  const evidence = text(item.evidence);
  if (/szerint|mondta/iu.test(evidence) && !item.attribution) return "attribution_error";
  if (/\d/iu.test(evidence) && !item.unit) return "unit_binding";
  if (/\d/iu.test(evidence)) return "numeric_scope";
  if (/dátum|január|február|március|április|május|június|július|augusztus|szeptember|október|november|december/iu.test(evidence)) return "temporal_binding";
  if (/ismeretlen|nem/iu.test(evidence)) return "negation_or_abstention";
  if (item.predicate === "TEXT_ASSERTION") return "unsupported_inference";
  return "wrong_predicate";
}
function collectTier(dataset) {
  const predictions = predictArticles(dataset);
  const rows = [];
  const allPredictions = new Map();
  for (const scenario of predictions.scenarios) {
    for (const field of ["entities", "claims", "relations", "events", "conflicts", "changes", "omissions"]) {
      for (const item of scenario[field] || []) {
        const identity = `${scenario.id}|${field}|${field === "claims" ? claimKey({ ...item, __scenarioId: scenario.id }) : field === "entities" ? entityKey({ ...item, __scenarioId: scenario.id }) : JSON.stringify(item)}`;
        allPredictions.set(identity, (allPredictions.get(identity) || 0) + 1);
      }
    }
  }
  for (const scenario of dataset.scenarios) {
    const predicted = predictions.scenarios.find((item) => item.id === scenario.id) || {};
    for (const field of ["entities", "claims", "relations", "events", "conflicts", "changes", "omissions"]) {
      const expected = scenario.expected?.[field] || scenario.expected?.[field === "changes" ? "changesOverTime" : field] || [];
      for (const item of predicted[field] || []) {
        const matched = field === "claims"
          ? expected.some((candidate) => claimKey({ ...candidate, __scenarioId: scenario.id }) === claimKey({ ...item, __scenarioId: scenario.id }) && evidenceCompatible(candidate, item))
          : field === "entities"
            ? expected.some((candidate) => entityKey({ ...candidate, __scenarioId: scenario.id }) === entityKey({ ...item, __scenarioId: scenario.id }))
            : expected.some((candidate) => {
              const keyFor = field === "relations" ? relationKey : field === "events" ? eventKey : field === "conflicts" ? conflictKey : field === "changes" ? changeKey : omissionKey;
              return keyFor({ ...candidate, __scenarioId: scenario.id }) === keyFor({ ...item, __scenarioId: scenario.id });
            });
        if (matched) continue;
        const nearest = expected.find((candidate) => text(candidate.source).toLowerCase() === text(item.source).toLowerCase()) || null;
        const identity = `${scenario.id}|${field}|${field === "claims" ? claimKey({ ...item, __scenarioId: scenario.id }) : field === "entities" ? entityKey({ ...item, __scenarioId: scenario.id }) : JSON.stringify(item)}`;
        const integrity = classifyIntegrity({ dataset, scenarioId: scenario.id, field, item, expected, duplicate: (allPredictions.get(identity) || 0) > 1 });
        rows.push({ scenarioId: scenario.id, field, source: item.source || null, snippet: text(item.evidence || item.mention || item.text).slice(0, 180), prediction: item, nearestExpected: nearest, category: category(item, field), integrityClassification: integrity.classification, classificationReason: integrity.reason, rootCauseComponent: "lib/v2/deterministic-semantic.js" });
      }
    }
  }
  return rows;
}
const rows = [...collectTier(buildBenchmarkDataset()), ...collectTier(buildDenseBenchmarkDataset())]
  .sort((left, right) => `${left.category}|${left.scenarioId}`.localeCompare(`${right.category}|${right.scenarioId}`))
  .slice(0, 50);
const counts = Object.fromEntries(["TRUE_UNSUPPORTED", "SUPPORTED_BUT_NOT_IN_GOLD", "SEMANTIC_MISMATCH", "DUPLICATE", "EVALUATOR_MISMATCH"].map((name) => [name, rows.filter((row) => row.integrityClassification === name).length]));
const output = { generatedAt: new Date().toISOString(), count: rows.length, integrityTaxonomy: counts, taxonomy: Object.fromEntries([...new Set(rows.map((row) => row.category))].map((name) => [name, rows.filter((row) => row.category === name).length])), rows };
const outputPath = path.join(__dirname, "..", "docs", "UTOM_V2_2", "11_false_positives_top50.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, count: rows.length, integrityTaxonomy: counts }));
