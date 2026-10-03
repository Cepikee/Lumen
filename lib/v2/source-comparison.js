"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const MAX_LIMIT = 100;

function positiveId(value, field) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`);
  return Number(value);
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function iso(value) {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function json(value) {
  if (value == null || typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
}

function displaySource(row) {
  const name = typeof row.source === "string" ? row.source.trim() : "";
  return name || "Ismeretlen";
}

function sourceKey(row) {
  if (row.sourceId != null) return `id:${row.sourceId}`;
  return `name:${displaySource(row).toLocaleLowerCase()}`;
}

function claimKey(row) {
  if (row.claimGroupId != null) return `group:${row.claimGroupId}`;
  return [row.subjectEntityId ?? "", row.predicate ?? "", row.claimType ?? "", row.validFrom ?? "", row.validUntil ?? ""].join("|");
}

function claimValue(row) {
  const parsed = json(row.valueJson);
  const rawValue = parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
  const value = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) && Object.prototype.hasOwnProperty.call(rawValue, "value") ? rawValue.value : rawValue;
  const numeric = typeof value === "number" ? value : (typeof value === "string" && value.trim() !== "" ? finiteNumber(value) : null);
  const unit = parsed?.unit ?? (rawValue && typeof rawValue === "object" ? rawValue.unit : null);
  return { value: numeric == null ? value ?? null : numeric, unit: typeof unit === "string" && unit.trim() ? unit.trim() : null };
}

function attribution(row) {
  const parsed = json(row.valueJson);
  const type = typeof parsed?.attributionType === "string" ? parsed.attributionType.trim() : null;
  const entityId = parsed?.attributionEntityId == null ? null : finiteNumber(parsed.attributionEntityId);
  return type || entityId != null ? { type, entityId: entityId == null ? null : positiveId(entityId, "attribution_entity_id") } : null;
}

function publicStatus(value) {
  const status = String(value || "observed").toLowerCase();
  if (status === "inferred") return "inferred";
  if (status === "disputed") return "disputed";
  if (status === "verified") return "verified";
  return "reported";
}

function stableSource(a, b) {
  const name = String(a.name).localeCompare(String(b.name), "hu");
  return name || (a.id == null ? Number.MAX_SAFE_INTEGER : a.id) - (b.id == null ? Number.MAX_SAFE_INTEGER : b.id);
}

function buildSourceComparison(rows, { page = 1, limit = 50 } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows_must_be_array");
  if (!Number.isSafeInteger(page) || page < 1) throw new TypeError("page_invalid");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new TypeError("limit_invalid");
  const sources = new Map();
  const groups = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const key = sourceKey(row);
    const sourceId = row.sourceId == null ? null : positiveId(row.sourceId, "source_id");
    const source = sources.get(key) || { id: sourceId, name: displaySource(row), articleCount: 0, firstPublishedAt: null, lastPublishedAt: null, _articleIds: new Set() };
    if (row.articleId != null) source._articleIds.add(String(row.articleId));
    else source._articleIds.add(`row:${source._articleIds.size}`);
    source.articleCount = source._articleIds.size;
    const published = iso(row.publishedAt);
    if (!source.firstPublishedAt || (published && published < source.firstPublishedAt)) source.firstPublishedAt = published;
    if (!source.lastPublishedAt || (published && published > source.lastPublishedAt)) source.lastPublishedAt = published;
    sources.set(key, source);
    const group = groups.get(claimKey(row)) || { key: claimKey(row), predicate: String(row.predicate || ""), claimType: String(row.claimType || ""), observations: new Map() };
    const observation = group.observations.get(key) || { source: { id: source.id, name: source.name }, claimIds: [], values: [], attributions: [], temporal: [], evidenceCount: 0, statuses: [] };
    if (row.claimId != null) observation.claimIds.push(positiveId(row.claimId, "claim_id"));
    const value = claimValue(row);
    if (!observation.values.some((item) => JSON.stringify(item) === JSON.stringify(value))) observation.values.push(value);
    const itemAttribution = attribution(row);
    if (itemAttribution && !observation.attributions.some((item) => JSON.stringify(item) === JSON.stringify(itemAttribution))) observation.attributions.push(itemAttribution);
    const temporal = { start: iso(row.validFrom), end: iso(row.validUntil) };
    if (!observation.temporal.some((item) => item.start === temporal.start && item.end === temporal.end)) observation.temporal.push(temporal);
    observation.evidenceCount += Number(row.evidenceCount || 0);
    if (row.status != null && !observation.statuses.includes(publicStatus(row.status))) observation.statuses.push(publicStatus(row.status));
    group.observations.set(key, observation);
    groups.set(group.key, group);
  }
  const orderedSources = [...sources.values()].map((source) => { const copy = { ...source }; delete copy._articleIds; return copy; }).sort(stableSource);
  const orderedGroups = [...groups.values()].sort((a, b) => a.predicate.localeCompare(b.predicate, "hu") || a.key.localeCompare(b.key));
  const total = orderedGroups.length;
  const start = (page - 1) * limit;
  const claims = orderedGroups.slice(start, start + limit).map((group) => {
    const observations = [...group.observations.values()].sort((a, b) => stableSource(a.source, b.source)).map((observation) => ({
      source: observation.source,
      claimIds: [...new Set(observation.claimIds)].sort((a, b) => a - b),
      values: observation.values,
      attribution: observation.attributions.length === 1 ? observation.attributions[0] : observation.attributions,
      temporal: observation.temporal,
      evidenceCount: observation.evidenceCount,
      status: observation.statuses.length === 1 ? observation.statuses[0] : observation.statuses,
    }));
    return { key: group.key, predicate: group.predicate || null, claimType: group.claimType || null, coverage: observations.length > 1 ? "shared" : "source_only", observations };
  });
  return {
    contractVersion: CONTRACT_VERSIONS.sourceComparison,
    sources: orderedSources,
    claims,
    pagination: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) },
    dimensions: ["publication_timing", "claim_coverage", "claim_values", "attribution", "temporal_scope", "evidence_count"],
    authority: { ranking: false, winner: null, trustScore: null, biasScore: null, majorityAsTruth: false },
    ai: { providerCalls: 0 },
  };
}

module.exports = { MAX_LIMIT, buildSourceComparison };
