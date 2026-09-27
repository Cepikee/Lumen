"use strict";

const RELATED_WINDOW_DAYS = 7;

function normalizeRelatedSource(value) {
  return String(value || "").trim().toLowerCase().replaceAll(".", "").replaceAll(" ", "");
}

function withinRelatedWindow(candidateDate, currentDate, days = RELATED_WINDOW_DAYS) {
  const candidate = new Date(candidateDate).getTime();
  const current = new Date(currentDate).getTime();
  return Number.isFinite(candidate) && Number.isFinite(current) && Math.abs(candidate - current) <= days * 86_400_000;
}

function selectRelatedCandidates(current, candidates, limit = 5) {
  const seenArticles = new Set();
  return candidates
    .filter((candidate) => candidate.summaryId !== current.summaryId)
    .filter((candidate) => candidate.articleId && candidate.articleId !== current.articleId)
    .filter((candidate) => withinRelatedWindow(candidate.createdAt, current.createdAt))
    .filter((candidate) => {
      const clusterMatch = current.clusterId != null && candidate.clusterId === current.clusterId;
      return clusterMatch || normalizeRelatedSource(candidate.source) === normalizeRelatedSource(current.source);
    })
    .filter((candidate) => {
      if (seenArticles.has(candidate.articleId)) return false;
      seenArticles.add(candidate.articleId);
      return true;
    })
    .sort((a, b) => {
      const aCluster = current.clusterId != null && a.clusterId === current.clusterId ? 0 : 1;
      const bCluster = current.clusterId != null && b.clusterId === current.clusterId ? 0 : 1;
      return aCluster - bCluster || new Date(b.createdAt) - new Date(a.createdAt) || b.summaryId - a.summaryId;
    })
    .slice(0, Math.min(20, Math.max(1, limit)));
}

module.exports = { RELATED_WINDOW_DAYS, normalizeRelatedSource, selectRelatedCandidates, withinRelatedWindow };
