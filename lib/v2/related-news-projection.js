"use strict";

const { normalizeSourceIdentity } = require("../source-identity");
const { CONTRACT_VERSIONS } = require("./contract-versions");

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function canonicalSource(value) {
  if (value == null || String(value).trim() === "") return null;
  return normalizeSourceIdentity(value)?.key || String(value).trim().toLowerCase() || null;
}

function projectRelatedNews(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("invalid_related_projection_input");
  const currentSummaryId = positiveId(input.currentSummaryId);
  const currentArticleId = positiveId(input.currentArticleId);
  const rows = input.rows;
  if (rows != null && !Array.isArray(rows)) throw new TypeError("invalid_related_snapshot");
  if (rows == null) return freeze({ contractVersion: CONTRACT_VERSIONS.relatedNewsProjection, current: { summaryId: currentSummaryId, articleId: currentArticleId }, items: null });

  const seen = new Set();
  const items = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const summaryId = positiveId(row.id ?? row.summaryId);
    if (summaryId == null || summaryId === currentSummaryId) continue;
    const articleId = positiveId(row.article_id ?? row.articleId);
    if (articleId != null && articleId === currentArticleId) continue;
    const identity = articleId ?? `summary:${summaryId}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    items.push({
      summaryId,
      articleId,
      title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : null,
      url: typeof row.url === "string" && row.url.trim() ? row.url.trim() : null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      source: canonicalSource(String(row.source_name ?? "").trim() ? row.source_name : row.source),
      sourceId: positiveId(row.source_id ?? row.sourceId),
    });
  }
  return freeze({ contractVersion: CONTRACT_VERSIONS.relatedNewsProjection, current: { summaryId: currentSummaryId, articleId: currentArticleId }, items });
}

module.exports = { projectRelatedNews };
