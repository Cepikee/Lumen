"use strict";

const STATIC_PATHS = new Set([
  "", "clickbait", "clickbait-ratio", "duplication", "forecast", "heatmap",
  "sentiment/by-category", "sentiment/timeline", "sentiment/today", "source-activity",
  "source-category-distribution", "speedindex/leaderboard", "spike-detection", "timeseries",
  "timeseries/all", "trending-keywords", "UtomDnsOsszkep",
]);

function normalizeInsightsPath(parts) {
  const decoded = (parts || []).map((part) => {
    try { return decodeURIComponent(part); } catch { return ""; }
  });
  if (decoded.some((part) => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\"))) {
    return null;
  }
  const joined = decoded.join("/");
  if (STATIC_PATHS.has(joined)) return joined;
  // A whitespace-only category is not a real category.  Passing it through
  // makes the downstream category route interpret the normalized value as
  // NULL and return the uncategorized bucket instead of rejecting the input.
  if (decoded.length === 2 && decoded[0] === "category" && decoded[1].trim().length > 0 && decoded[1].length <= 100) return joined;
  return null;
}

module.exports = { normalizeInsightsPath };
