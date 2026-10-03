"use strict";

const crypto = require("node:crypto");
const { canonicalizeArticleUrl } = require("../article-identity");
const { normalizeSourceIdentity } = require("../source-identity");
const { existingClusterId } = require("../../pipeline/idempotency");
const { CONTRACT_VERSIONS } = require("./contract-versions");

const DUPLICATE_STATES = new Set(["new_article", "same_article", "unknown"]);

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError(`invalid_${field}`);
  return id;
}

function uniqueSortedIds(values, selfId) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => Number(value)).filter((id) => Number.isSafeInteger(id) && id > 0 && id !== selfId))].sort((a, b) => a - b);
}

function sourceKey(value) {
  if (value == null || String(value).trim() === "") return null;
  return normalizeSourceIdentity(value)?.key || String(value).trim().toLowerCase() || null;
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function duplicateState(input) {
  const explicit = input.duplicateState || input.dedup?.state;
  if (DUPLICATE_STATES.has(explicit)) return explicit;
  if (input.ingestionOutcome === "inserted") return "new_article";
  if (input.ingestionOutcome === "deduplicated") return "same_article";
  return "unknown";
}

/**
 * Adapt an already-computed legacy ingestion/cluster result. This function
 * never queries or writes the database and never makes a deduplication or
 * clustering decision of its own.
 */
function adaptDedupClusterResult(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("invalid_dedup_cluster_input");
  const articleId = positiveId(input.articleId, "article_id");
  const canonicalUrl = canonicalizeArticleUrl(input.canonicalUrl ?? input.urlCanonical ?? input.originalUrl);
  if (!canonicalUrl) throw new TypeError("invalid_canonical_article_url");
  const clusterResult = input.clusterResult ?? input.cluster ?? null;
  const clusterId = existingClusterId(clusterResult?.clusterId ?? clusterResult?.id ?? input.clusterId);
  const members = uniqueSortedIds(clusterResult?.memberArticleIds ?? clusterResult?.members, articleId);
  const hasRelatedSnapshot = Object.prototype.hasOwnProperty.call(input, "relatedArticleIds") || Object.prototype.hasOwnProperty.call(input, "relatedArticles");
  const relatedArticleIds = hasRelatedSnapshot
    ? uniqueSortedIds(input.relatedArticleIds ?? input.relatedArticles, articleId)
    : null;
  const output = {
    contractVersion: CONTRACT_VERSIONS.dedupClusterAdapter,
    article: {
      id: articleId,
      canonicalUrl,
      urlIdentity: crypto.createHash("sha256").update(canonicalUrl).digest("hex"),
      source: sourceKey(input.source),
    },
    dedup: {
      state: duplicateState(input),
      sourceOfTruth: "legacy_article_identity",
    },
    cluster: clusterId == null ? null : {
      id: clusterId,
      memberArticleIds: members,
      sourceOfTruth: "legacy_cluster_assignment",
    },
    relatedArticleIds,
  };
  return freeze(output);
}

module.exports = { DUPLICATE_STATES, adaptDedupClusterResult };
