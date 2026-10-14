"use strict";

const fs = require("node:fs");
const path = require("node:path");

const [corpusArg, ...resultArgs] = process.argv.slice(2);
if (!corpusArg || resultArgs.length < 1) throw new Error("usage: evaluate-local-nlp-bakeoff.cjs CORPUS RESULT...");
const corpus = JSON.parse(fs.readFileSync(path.resolve(corpusArg), "utf8"));
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("hu-HU").replace(/\s+/gu, " ");
const ratio = (n, d) => d ? n / d : null;
const pairKey = (a, b) => `${normalize(a)}|${normalize(b)}`;

function score(payload) {
  let entityGold = 0, entityPredicted = 0, entityBoundaryTp = 0, entityTypeTp = 0, identityTp = 0;
  let bindingGold = 0, bindingPredicted = 0, bindingTp = 0;
  let dependencyGold = 0, dependencyPredicted = 0, dependencyTp = 0;
  let attributionGold = 0, attributionPredicted = 0, attributionTp = 0;
  let conditionalTp = 0, negationTp = 0;
  const rows = [];
  for (const gold of corpus.cases) {
    const found = payload.results.find((item) => item.id === gold.id)?.annotation || {};
    const goldEntities = gold.entities.map(([text, type, canonical]) => ({ text, type, canonical }));
    const predictedEntities = found.entities || [];
    entityGold += goldEntities.length; entityPredicted += predictedEntities.length;
    for (const expected of goldEntities) {
      const boundary = predictedEntities.find((item) => normalize(item.text) === normalize(expected.text));
      if (boundary) entityBoundaryTp += 1;
      if (boundary?.type === expected.type) entityTypeTp += 1;
      if (boundary && normalize(boundary.canonical) === normalize(expected.canonical)) identityTp += 1;
    }
    const goldBindings = new Set(gold.numericBindings.map(([number, subject]) => pairKey(number, subject)));
    const predictedBindings = new Set((found.numericBindings || []).filter((x) => x.subjectText).map((x) => pairKey(x.numberText, x.subjectText)));
    bindingGold += goldBindings.size; bindingPredicted += predictedBindings.size;
    bindingTp += [...predictedBindings].filter((key) => goldBindings.has(key)).length;
    const goldDependencies = new Set(gold.dependencies.map(([subject, predicate]) => pairKey(subject, predicate)));
    const predictedDependencies = new Set((found.dependencies || []).map((x) => pairKey(x.subjectText, x.predicateLemma)));
    dependencyGold += goldDependencies.size; dependencyPredicted += predictedDependencies.size;
    dependencyTp += [...predictedDependencies].filter((key) => goldDependencies.has(key)).length;
    const goldAttributions = new Set(gold.attributions.map(([source, verb]) => pairKey(source, verb)));
    const predictedAttributions = new Set((found.attributions || []).filter((x) => x.sourceText).map((x) => pairKey(x.sourceText, x.reportingLemma)));
    attributionGold += goldAttributions.size; attributionPredicted += predictedAttributions.size;
    attributionTp += [...predictedAttributions].filter((key) => goldAttributions.has(key)).length;
    conditionalTp += Boolean(found.conditional) === Boolean(gold.conditional) ? 1 : 0;
    negationTp += Boolean(found.negated) === Boolean(gold.negated) ? 1 : 0;
    rows.push({ id: gold.id, entityCount: predictedEntities.length, bindingCount: predictedBindings.size, attributionCount: predictedAttributions.size, conditional: Boolean(found.conditional), negated: Boolean(found.negated) });
  }
  return {
    provider: payload.provider,
    candidateOnly: payload.candidateOnly,
    metrics: {
      entityPrecision: ratio(entityBoundaryTp, entityPredicted),
      entityRecall: ratio(entityBoundaryTp, entityGold),
      entityBoundaryAccuracy: ratio(entityBoundaryTp, entityGold),
      entityTypingAccuracy: ratio(entityTypeTp, entityGold),
      canonicalIdentityAccuracy: ratio(identityTp, entityGold),
      actorBindingPrecision: ratio(bindingTp, bindingPredicted),
      actorBindingRecall: ratio(bindingTp, bindingGold),
      numericSubjectBindingAccuracy: ratio(bindingTp, bindingGold),
      dependencyPrecision: ratio(dependencyTp, dependencyPredicted),
      dependencyRecall: ratio(dependencyTp, dependencyGold),
      attributionSourcePrecision: ratio(attributionTp, attributionPredicted),
      attributionSourceRecall: ratio(attributionTp, attributionGold),
      conditionalScopeAccuracy: ratio(conditionalTp, corpus.cases.length),
      negationAccuracy: ratio(negationTp, corpus.cases.length),
    },
    performance: payload.performance,
    rows,
  };
}

const evaluations = resultArgs.map((file) => score(JSON.parse(fs.readFileSync(path.resolve(file), "utf8"))));
process.stdout.write(`${JSON.stringify({ corpusVersion: corpus.version, cases: corpus.cases.length, evaluations }, null, 2)}\n`);
