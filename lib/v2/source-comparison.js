"use strict";

const { createHash } = require("node:crypto");
const { CONTRACT_VERSIONS } = require("./contract-versions");

const MAX_LIMIT = 100;
const positiveId = (value) => (/^[1-9][0-9]*$/.test(String(value)) ? Number(value) : null);
function iso(value) { if (value == null) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function json(value) { if (value == null || typeof value === "object") return value; try { return JSON.parse(value); } catch { return null; } }
function canonicalJson(value) { if (Array.isArray(value)) return value.map(canonicalJson); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])])); }
const stableJson = (value) => JSON.stringify(canonicalJson(value));
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

function sourceIdentity(row) {
  const id = positiveId(row?.sourceId);
  const key = typeof row?.sourceKey === "string" ? row.sourceKey.trim().toLowerCase() : "";
  const name = typeof row?.source === "string" ? row.source.trim() : "";
  return id && key && name ? Object.freeze({ id, key, name }) : null;
}

function claimValue(row) {
  const parsed = json(row.valueJson);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Object.freeze({ value: parsed, unit: null });
  const raw = Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
  const value = raw && typeof raw === "object" && !Array.isArray(raw) && Object.prototype.hasOwnProperty.call(raw, "value") ? raw.value : raw;
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
  const unit = parsed.unit ?? (raw && typeof raw === "object" ? raw.unit : null);
  return Object.freeze({ value: number == null ? value ?? null : number, unit: typeof unit === "string" && unit.trim() ? unit.trim() : null });
}

function qualifiers(row) {
  const parsed = json(row.valueJson);
  return Object.freeze({ polarity: typeof parsed?.polarity === "string" ? parsed.polarity : "unknown", uncertainty: parsed?.uncertainty === true, conditional: parsed?.conditional === true, modality: typeof parsed?.modality === "string" ? parsed.modality : null });
}

function attribution(row) {
  const parsed = json(row.valueJson);
  const type = typeof parsed?.attributionType === "string" && parsed.attributionType.trim() ? parsed.attributionType.trim() : null;
  const entityId = parsed?.attributionEntityId == null ? null : positiveId(parsed.attributionEntityId);
  return type || entityId ? Object.freeze({ type, entityId }) : null;
}

function evidenceItems(row, source, articleId, claimId) {
  const raw = Array.isArray(row.evidence) ? row.evidence : json(row.evidenceJson);
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = positiveId(item.id); const evidenceArticleId = positiveId(item.articleId); const evidenceSourceId = positiveId(item.sourceId);
    const textSpan = typeof item.textSpan === "string" && item.textSpan.trim() ? item.textSpan.slice(0, 1000) : null;
    if (!id || evidenceArticleId !== articleId || evidenceSourceId !== source.id || !textSpan || seen.has(id)) return [];
    seen.add(id);
    return [Object.freeze({ id, claimId, articleId, sourceId: source.id, textSpan, supportType: typeof item.supportType === "string" ? item.supportType : null })];
  }).sort((left, right) => left.id - right.id);
}

function publicStatus(value) {
  const status = String(value || "observed").toLowerCase();
  if (status === "inferred" || status === "disputed" || status === "verified") return status;
  if (status === "superseded" || status === "retracted") return "conditional";
  return "reported";
}
const stableSource = (left, right) => left.key.localeCompare(right.key, "hu") || left.id - right.id;

function observationFrom(row, source) {
  const claimId = positiveId(row.claimId); const articleId = positiveId(row.articleId);
  const subjectEntityId = positiveId(row.subjectCanonicalId ?? row.subjectEntityId);
  const objectEntityId = row.objectEntityId == null ? null : positiveId(row.objectCanonicalId ?? row.objectEntityId);
  const predicate = typeof row.predicate === "string" ? row.predicate.trim() : "";
  const claimType = typeof row.claimType === "string" ? row.claimType.trim() : "";
  if (!claimId || !articleId || !subjectEntityId || !predicate || !claimType) return null;
  if (row.subjectEntityStatus === "unresolved" || (row.objectEntityId != null && (!objectEntityId || row.objectEntityStatus === "unresolved"))) return null;
  const evidence = evidenceItems(row, source, articleId, claimId);
  if (!evidence.length) return null;
  const temporal = Object.freeze({ start: iso(row.validFrom), end: iso(row.validUntil) });
  if ((row.validFrom != null && !temporal.start) || (row.validUntil != null && !temporal.end)) return null;
  const value = claimValue(row);
  if (objectEntityId == null && value.value == null) return null;
  return Object.freeze({ claimId, articleId, source, subjectEntityId, objectEntityId, predicate, claimType, value, normalizedValue: typeof row.normalizedValue === "string" && row.normalizedValue.trim() ? row.normalizedValue.trim() : null, attribution: attribution(row), qualifiers: qualifiers(row), temporal, status: publicStatus(row.status), evidence, publishedAt: iso(row.publishedAt) });
}

function semanticParts(observation) {
  return { subjectEntityId: observation.subjectEntityId, predicate: observation.predicate, claimType: observation.claimType, objectEntityId: observation.objectEntityId, value: observation.value, normalizedValue: observation.normalizedValue, temporal: observation.temporal, attribution: observation.attribution, qualifiers: observation.qualifiers, status: observation.status };
}
const propositionKey = (observation) => `proposition:${hash(stableJson(semanticParts(observation)))}`;
const contextKey = (observation) => hash(stableJson({ subjectEntityId: observation.subjectEntityId, predicate: observation.predicate, claimType: observation.claimType, temporal: observation.temporal, attribution: observation.attribution, qualifiers: observation.qualifiers }));

function mergeObservation(current, next) {
  const claimIds = [...new Set([...(current?.claimIds || []), next.claimId])].sort((a, b) => a - b);
  const articleIds = [...new Set([...(current?.articleIds || []), next.articleId])].sort((a, b) => a - b);
  const evidence = [...(current?.evidence || []), ...next.evidence].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).sort((a, b) => a.id - b.id);
  return { source: next.source, claimIds, articleIds, value: next.value, objectEntityId: next.objectEntityId, normalizedValue: next.normalizedValue, attribution: next.attribution, temporal: next.temporal, evidence, evidenceCount: evidence.length, status: next.status };
}

function buildSourceComparison(rows, { page = 1, limit = 50 } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows_must_be_array");
  if (!Number.isSafeInteger(page) || page < 1) throw new TypeError("page_invalid");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new TypeError("limit_invalid");
  const sources = new Map(); const propositions = new Map(); const contexts = new Map(); let skipped = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") { skipped += 1; continue; }
    const source = sourceIdentity(row);
    if (!source) { skipped += 1; continue; }
    const sourceEntry = sources.get(source.key) || { ...source, articleCount: 0, firstPublishedAt: null, lastPublishedAt: null, _articleIds: new Set() };
    const articleId = positiveId(row.articleId); if (articleId) sourceEntry._articleIds.add(articleId); sourceEntry.articleCount = sourceEntry._articleIds.size;
    const publishedAt = iso(row.publishedAt);
    if (publishedAt && (!sourceEntry.firstPublishedAt || publishedAt < sourceEntry.firstPublishedAt)) sourceEntry.firstPublishedAt = publishedAt;
    if (publishedAt && (!sourceEntry.lastPublishedAt || publishedAt > sourceEntry.lastPublishedAt)) sourceEntry.lastPublishedAt = publishedAt;
    sources.set(source.key, sourceEntry);
    if (row.claimId == null) continue;
    const observation = observationFrom(row, source);
    if (!observation) { skipped += 1; continue; }
    const key = propositionKey(observation); const context = contextKey(observation);
    const group = propositions.get(key) || { key, context, predicate: observation.predicate, claimType: observation.claimType, subjectEntityId: observation.subjectEntityId, observations: new Map() };
    group.observations.set(source.key, mergeObservation(group.observations.get(source.key), observation)); propositions.set(key, group);
    const contextSources = contexts.get(context) || new Set(); contextSources.add(source.key); contexts.set(context, contextSources);
  }
  const orderedSources = [...sources.values()].map((source) => { const result = { ...source }; delete result._articleIds; return result; }).sort(stableSource);
  const orderedGroups = [...propositions.values()].sort((left, right) => left.predicate.localeCompare(right.predicate, "hu") || left.key.localeCompare(right.key));
  const total = orderedGroups.length; const start = (page - 1) * limit;
  const claims = orderedGroups.slice(start, start + limit).map((group) => {
    const observations = [...group.observations.values()].sort((left, right) => stableSource(left.source, right.source));
    const coverage = observations.length > 1 ? "shared" : "source_only"; const observationSources = new Set(observations.map((item) => item.source.key)); const relatedSources = contexts.get(group.context) || new Set();
    const coverageBySource = orderedSources.map((source) => ({ source: { id: source.id, key: source.key, name: source.name }, state: observationSources.has(source.key) ? coverage : relatedSources.has(source.key) ? "different_observation" : "not_covered" }));
    return { key: group.key, predicate: group.predicate, claimType: group.claimType, subjectEntityId: group.subjectEntityId, coverage, observations, coverageBySource };
  });
  const sharedClaims = orderedGroups.filter((group) => group.observations.size > 1).length; const sourceOnlyClaims = total - sharedClaims;
  const status = orderedSources.length < 2 ? "insufficient_evidence" : total === 0 ? "empty" : "ready";
  return { contractVersion: CONTRACT_VERSIONS.sourceComparison, status, sources: orderedSources, claims, pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) }, metrics: { sourcesCompared: orderedSources.length, claimsCompared: total, sharedClaims, sourceOnlyClaims, unmatchedClaims: sourceOnlyClaims, observationsSkipped: skipped }, dimensions: ["claim_coverage", "claim_values", "attribution", "temporal_scope", "evidence"], authority: { ranking: false, winner: null, trustScore: null, biasScore: null, majorityAsTruth: false, conflictClassification: false }, ai: { providerCalls: 0 } };
}

module.exports = { MAX_LIMIT, buildSourceComparison, propositionKey };
