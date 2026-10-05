"use strict";

function list(value) { return Array.isArray(value) ? value : []; }
function key(value) { return String(value == null ? "" : value).trim().toLowerCase(); }
function scenarioKey(item) { return key(item?.__scenarioId || item?.scenarioId); }
function valueKey(value) {
  if (value == null) return "null";
  if (typeof value === "object") return JSON.stringify(value, Object.keys(value).sort());
  return String(value).trim().toLowerCase();
}
function claimKey(claim) {
  const rawValue = claim.normalizedValue ?? claim.value;
  const inferredUnit = claim.unit ?? (rawValue && typeof rawValue === "object" ? rawValue.unit : null);
  return [scenarioKey(claim), key(claim.source), key(claim.predicate), valueKey(rawValue), key(inferredUnit), key(claim.subject), key(claim.scope), key(claim.eventId)].join("|");
}
function evidenceKey(claim) { return key(claim.evidence || claim.evidenceText || claim.text); }
function groundedClaimKey(claim) { return `${claimKey(claim)}|${evidenceKey(claim)}`; }
function evidenceCompatible(expected, actual) {
  const left = evidenceKey(expected);
  const right = evidenceKey(actual);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}
function claimOverlap(expected, actual) {
  const expectedItems = list(expected);
  const actualItems = list(actual);
  const used = new Set();
  let truePositive = 0;
  for (const item of actualItems) {
    const index = expectedItems.findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && claimKey(candidate) === claimKey(item) && evidenceCompatible(candidate, item));
    if (index >= 0) { used.add(index); truePositive += 1; }
  }
  const expectedCount = expectedItems.length;
  const predictedCount = actualItems.length;
  return { truePositive, expected: expectedCount, predicted: predictedCount, falsePositive: Math.max(0, predictedCount - truePositive), falseNegative: Math.max(0, expectedCount - truePositive), precision: predictedCount === 0 ? null : truePositive / predictedCount, recall: expectedCount === 0 ? null : truePositive / expectedCount };
}
function entityKey(entity) { return [scenarioKey(entity), key(entity.normalized || entity.mention || entity.id), key(entity.type)].join("|"); }
function entityCompatible(expected, actual) {
  if (scenarioKey(expected) !== scenarioKey(actual) || key(expected.type) !== key(actual.type)) return false;
  const expectedId = key(expected.id);
  const actualId = key(actual.id);
  if (expectedId && actualId && expectedId === actualId) return true;
  return Boolean(key(expected.normalized || expected.mention) && key(expected.normalized || expected.mention) === key(actual.normalized || actual.mention));
}
function entityOverlap(expected, actual) {
  const used = new Set(); let truePositive = 0;
  for (const item of list(actual)) {
    const index = list(expected).findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && entityCompatible(candidate, item));
    if (index >= 0) { used.add(index); truePositive += 1; }
  }
  const expectedCount = list(expected).length; const predictedCount = list(actual).length;
  return { truePositive, expected: expectedCount, predicted: predictedCount, falsePositive: Math.max(0, predictedCount - truePositive), falseNegative: Math.max(0, expectedCount - truePositive), precision: predictedCount === 0 ? null : truePositive / predictedCount, recall: expectedCount === 0 ? null : truePositive / expectedCount };
}
function relationKey(relation) { return [scenarioKey(relation), key(relation.subject), key(relation.predicate), key(relation.object)].join("|"); }
function eventKey(event) { return [scenarioKey(event), key(event.id || event.title)].join("|"); }
function changeKey(change) { return [scenarioKey(change), valueKey(change.from), valueKey(change.to), key(change.explanation)].join("|"); }
function omissionKey(item) { return [scenarioKey(item), key(item.source), key(item.predicate), key(item.status || "not_mentioned")].join("|"); }
function conflictKey(item) { return [scenarioKey(item), key(item.type || item.conflictType), list(item.claims).map(key).sort().join(",")].join("|"); }
function overlap(expected, actual, makeKey) {
  const expectedKeys = new Set(list(expected).map(makeKey));
  const actualKeys = new Set(list(actual).map(makeKey));
  let truePositive = 0;
  for (const item of actualKeys) if (expectedKeys.has(item)) truePositive += 1;
  const expectedCount = expectedKeys.size;
  const predictedCount = actualKeys.size;
  return {
    truePositive,
    expected: expectedCount,
    predicted: predictedCount,
    falsePositive: Math.max(0, predictedCount - truePositive),
    falseNegative: Math.max(0, expectedCount - truePositive),
    precision: predictedCount === 0 ? null : truePositive / predictedCount,
    recall: expectedCount === 0 ? null : truePositive / expectedCount,
  };
}
function safeRatio(numerator, denominator) { return denominator === 0 ? null : numerator / denominator; }
function supportedClaim(claim) {
  if (!claim || typeof claim !== "object") return false;
  if (!/^[A-Z][A-Z0-9_]{1,127}$/.test(String(claim.predicate || ""))) return false;
  if (["TEXT_ASSERTION", "UNSPECIFIED_CLAIM"].includes(String(claim.predicate))) return false;
  const unit = claim.unit ?? (claim.value && typeof claim.value === "object" ? claim.value.unit : null);
  return typeof claim.value === "number" || typeof claim.value === "boolean" || unit === "date" || Boolean(claim.attribution) || claim.polarity === "negated" || claim.conditional === true;
}
function supportedClaimSubset(expectedClaims, actualClaims) {
  const expected = list(expectedClaims).filter(supportedClaim);
  const actual = list(actualClaims).filter(supportedClaim);
  return { ...claimOverlap(expected, actual), expected: expected.length, predicted: actual.length, supportedExpected: expected.length, supportedPredicted: actual.length };
}

/** Provider boundary used by the benchmark. Production code must not import gold manifests. */
function normalizeProviderOutput(input) {
  const source = input && typeof input === "object" ? input : {};
  const scenarios = list(source.scenarios).map((scenario) => {
    const item = scenario && typeof scenario === "object" ? scenario : {};
    return {
      id: item.id == null ? "" : String(item.id),
      entities: list(item.entities), relations: list(item.relations), claims: list(item.claims),
      events: list(item.events), conflicts: list(item.conflicts), changes: list(item.changes || item.changesOverTime), omissions: list(item.omissions),
    };
  });
  return { scenarios };
}

function emptyPredictions(dataset) {
  return normalizeProviderOutput({ scenarios: dataset.scenarios.map((scenario) => ({ id: scenario.id })) });
}

function flatten(dataset, predictions) {
  const normalized = normalizeProviderOutput(predictions);
  const predictionByScenario = new Map(normalized.scenarios.map((scenario) => [scenario.id, scenario]));
  const fields = ["entities", "relations", "claims", "events", "conflicts", "changes", "omissions"];
  const expected = Object.fromEntries(fields.map((field) => [field, []]));
  const actual = Object.fromEntries(fields.map((field) => [field, []]));
  for (const scenario of dataset.scenarios) {
    const expectedData = { ...scenario.expected, changes: scenario.expected?.changesOverTime || [] };
    const predicted = predictionByScenario.get(scenario.id) || {};
    for (const field of fields) {
      expected[field].push(...list(expectedData[field]).map((item) => ({ ...item, __scenarioId: scenario.id })));
      actual[field].push(...list(predicted[field]).map((item) => ({ ...item, __scenarioId: scenario.id })));
    }
  }
  return { expected, actual, predictionByScenario: normalized.scenarios.length ? predictionByScenario : new Map() };
}

function scenarioCoverage(dataset, predictions) {
  const normalized = normalizeProviderOutput(predictions);
  const byId = new Map(normalized.scenarios.map((scenario) => [scenario.id, scenario]));
  const fields = ["entities", "relations", "claims", "events", "conflicts", "changes", "omissions"];
  return dataset.scenarios.map((scenario) => {
    const expectedData = { ...scenario.expected, changes: scenario.expected?.changesOverTime || [] };
    const actual = byId.get(scenario.id) || {};
    const result = { id: scenario.id, fields: {} };
    for (const field of fields) {
      const expectedItems = list(expectedData[field]).map((item) => ({ ...item, __scenarioId: scenario.id }));
      const actualItems = list(actual[field]).map((item) => ({ ...item, __scenarioId: scenario.id }));
      const makeKey = field === "relations" ? relationKey : field === "events" ? eventKey : field === "conflicts" ? conflictKey : field === "changes" ? changeKey : omissionKey;
      const metric = field === "claims" ? claimOverlap(expectedItems, actualItems) : field === "entities" ? entityOverlap(expectedItems, actualItems) : overlap(expectedItems, actualItems, makeKey);
      result.fields[field] = metric;
    }
    return result;
  });
}

function qualityMetrics(expectedClaims, actualClaims) {
  const values = { attribution: [], evidence: [], temporal: [], negation: [], modality: [] };
  const identity = [];
  for (const expected of expectedClaims) {
    const actual = actualClaims.find((candidate) => claimKey(candidate) === claimKey(expected) && evidenceCompatible(expected, candidate));
    if (!actual) continue;
    values.attribution.push(JSON.stringify(actual.attribution || null) === JSON.stringify(expected.attribution || null));
    values.evidence.push(evidenceCompatible(expected, actual));
    values.temporal.push(JSON.stringify(actual.temporal || null) === JSON.stringify(expected.temporal || null));
    values.negation.push(key(actual.polarity || "affirmed") === key(expected.polarity || "affirmed"));
    values.modality.push(key(actual.modality) === key(expected.modality));
  }
  const quality = Object.fromEntries(Object.entries(values).map(([name, entries]) => {
    const correct = entries.filter(Boolean).length;
    return [name, { evaluated: entries.length, correct, accuracy: safeRatio(correct, entries.length) }];
  }));
  return { quality, identity };
}

function sourceTextsFor(dataset, item) {
  const scenario = dataset.scenarios.find((candidate) => key(candidate.id) === scenarioKey(item));
  if (!scenario) return [];
  const requested = key(item.source);
  const variants = list(scenario.sourceVariants);
  const selected = requested ? variants.filter((variant) => key(variant.source?.key || variant.source) === requested) : variants;
  return (selected.length ? selected : variants).map((variant) => String(variant.text || ""));
}
function groundingText(item, field) {
  if (field === "entities") return item.mention || item.normalized || "";
  if (field === "claims") return item.evidence || item.evidenceText || item.text || "";
  if (field === "relations") return typeof item.evidence === "string" ? item.evidence : item.evidence?.textSpan || "";
  return item.evidence || item.text || item.explanation || "";
}
function isGrounded(dataset, item, field) {
  const needle = groundingText(item, field).trim().toLocaleLowerCase("hu");
  if (!needle) return false;
  return sourceTextsFor(dataset, item).some((source) => source.toLocaleLowerCase("hu").includes(needle));
}
function itemMatches(expected, item, field) {
  if (field === "claims") return list(expected).some((candidate) => claimKey(candidate) === claimKey(item) && evidenceCompatible(candidate, item));
  if (field === "entities") return list(expected).some((candidate) => entityCompatible(candidate, item));
  const makeKey = field === "relations" ? relationKey : field === "events" ? eventKey : field === "conflicts" ? conflictKey : field === "changes" ? changeKey : omissionKey;
  const itemKey = makeKey(item);
  return list(expected).some((candidate) => makeKey(candidate) === itemKey);
}
function integrityMetrics(dataset, actual, expected) {
  const fields = ["entities", "relations", "claims", "events", "conflicts", "changes", "omissions"];
  let predictionCount = 0; let groundedCount = 0; let semanticallySupportedCount = 0; let matchedCount = 0;
  for (const field of fields) {
    for (const item of list(actual[field])) {
      predictionCount += 1;
      const grounded = isGrounded(dataset, item, field);
      if (grounded) groundedCount += 1;
      const semanticallySupported = grounded && (field !== "claims" || supportedClaim(item));
      if (semanticallySupported) semanticallySupportedCount += 1;
      if (itemMatches(expected[field], item, field)) matchedCount += 1;
    }
  }
  const extraSupportedCount = Math.max(0, semanticallySupportedCount - matchedCount);
  const trulyUnsupportedCount = Math.max(0, predictionCount - semanticallySupportedCount);
  return {
    predictionCount,
    groundedPredictionCount: groundedCount,
    groundedPredictionRate: safeRatio(groundedCount, predictionCount),
    semanticallySupportedPredictionCount: semanticallySupportedCount,
    semanticallySupportedPredictionRate: safeRatio(semanticallySupportedCount, predictionCount),
    goldMatchedPredictionCount: matchedCount,
    goldCoveragePrecision: safeRatio(matchedCount, semanticallySupportedCount),
    extraSupportedPredictionCount: extraSupportedCount,
    extraSupportedPredictionRate: safeRatio(extraSupportedCount, predictionCount),
    trulyUnsupportedPredictionCount: trulyUnsupportedCount,
    trulyUnsupportedPredictionRate: safeRatio(trulyUnsupportedCount, predictionCount),
  };
}

function evaluateDataset(dataset, predictions = emptyPredictions(dataset)) {
  const normalized = normalizeProviderOutput(predictions);
  const { expected, actual, predictionByScenario } = flatten(dataset, normalized);
  const metrics = {
    entity: entityOverlap(expected.entities, actual.entities),
    relation: overlap(expected.relations, actual.relations, relationKey),
    claim: claimOverlap(expected.claims, actual.claims),
    event: overlap(expected.events, actual.events, eventKey),
    conflict: overlap(expected.conflicts, actual.conflicts, conflictKey),
    changes: overlap(expected.changes, actual.changes, changeKey),
  };
  const qualityResult = qualityMetrics(expected.claims, actual.claims);
  const identityValues = []; const usedIdentity = new Set();
  for (const expectedEntity of expected.entities) {
    const actualIndex = actual.entities.findIndex((candidate, index) => !usedIdentity.has(index) && entityCompatible(expectedEntity, candidate));
    if (actualIndex >= 0) { usedIdentity.add(actualIndex); identityValues.push(key(actual.entities[actualIndex].identity) === key(expectedEntity.identity)); }
  }
  const identityCorrect = identityValues.filter(Boolean).length;
  const identityAccuracy = safeRatio(identityCorrect, identityValues.length);
  const predictedConflicts = new Set(actual.conflicts.map(conflictKey));
  const expectedConflicts = new Set(expected.conflicts.map(conflictKey));
  const falseConflictCount = [...predictedConflicts].filter((item) => !expectedConflicts.has(item)).length;
  const predictedTotal = Object.values(actual).reduce((total, values) => total + new Set(values.map((item) => item.__scenarioId + "|" + (item.id || item.key || JSON.stringify(item)))).size, 0);
  const matchedTotal = metrics.entity.truePositive + metrics.relation.truePositive + metrics.claim.truePositive + metrics.event.truePositive + metrics.conflict.truePositive + metrics.changes.truePositive + overlap(expected.omissions, actual.omissions, omissionKey).truePositive;
  const omissionMetric = overlap(expected.omissions, actual.omissions, omissionKey);
  const supportedClaims = supportedClaimSubset(expected.claims, actual.claims);
  const scenarioCoverageResult = scenarioCoverage(dataset, normalized);
  const quality = qualityResult.quality;
  const integrity = integrityMetrics(dataset, actual, expected);
  return {
    benchmarkVersion: dataset.benchmarkVersion || "v22.benchmark.1",
    evaluatorVersion: "v22.evaluator.3",
    contractVersion: "v22.intelligence-quality-baseline.2",
    scenarioCount: dataset.scenarios.length,
    articleCount: dataset.scenarios.reduce((count, scenario) => count + scenario.sourceVariants.length, 0),
    expectedCounts: Object.fromEntries(Object.entries(expected).map(([name, values]) => [name, values.length])),
    predictedCounts: Object.fromEntries(Object.entries(actual).map(([name, values]) => [name, values.length])),
    metrics: {
      entityPrecision: metrics.entity.precision, entityRecall: metrics.entity.recall,
      relationPrecision: metrics.relation.precision, relationRecall: metrics.relation.recall,
      claimPrecision: metrics.claim.precision, claimRecall: metrics.claim.recall,
      eventMatchingAccuracy: metrics.event.recall,
      conflictPrecision: metrics.conflict.precision, conflictRecall: metrics.conflict.recall,
      falseConflictRate: safeRatio(falseConflictCount, predictedConflicts.size),
      sourceOmissionPrecision: omissionMetric.precision, sourceOmissionRecall: omissionMetric.recall,
      temporalChangeRecall: metrics.changes.recall,
      identityAccuracy,
      unsupportedPredictionRate: safeRatio(Math.max(0, predictedTotal - matchedTotal), predictedTotal),
      ...Object.fromEntries(Object.entries(quality).flatMap(([name, value]) => [[`${name}Accuracy`, value.accuracy], [`${name}Evaluated`, value.evaluated]])),
      supportedClaimPrecision: supportedClaims.precision,
      supportedClaimRecall: supportedClaims.recall,
      supportedClaimExpected: supportedClaims.expected,
      supportedClaimPredicted: supportedClaims.predicted,
      ...integrity,
    },
    detail: { entity: metrics.entity, relation: metrics.relation, claim: metrics.claim, supportedClaims, event: metrics.event, conflict: metrics.conflict, changes: metrics.changes, sourceOmission: omissionMetric, quality, integrity, identity: { evaluated: identityValues.length, correct: identityCorrect, accuracy: identityAccuracy }, scenarios: scenarioCoverageResult },
    falseConflictCount,
    evaluatedScenarioIds: [...predictionByScenario.keys()],
    baselineNote: "A provider kimenetét a benchmark normalizációs határán értékeljük; a default mock szándékosan üres.",
  };
}

module.exports = { emptyPredictions, evaluateDataset, normalizeProviderOutput, scenarioCoverage, supportedClaimSubset, supportedClaim, claimKey, groundedClaimKey, entityKey, relationKey, eventKey, changeKey, omissionKey };
