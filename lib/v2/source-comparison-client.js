"use strict";
function normalizeSourceComparisonResponse(payload) {
  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") throw new TypeError("v2_source_comparison_response_invalid");
  const data = payload.data;
  return Object.freeze({
    sources: Array.isArray(data.sources) ? data.sources.filter((source) => source && typeof source === "object").map((source) => Object.freeze({ id: Number.isSafeInteger(Number(source.id)) ? Number(source.id) : null, name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Ismeretlen", articleCount: Number.isFinite(Number(source.articleCount)) ? Number(source.articleCount) : 0, firstPublishedAt: typeof source.firstPublishedAt === "string" ? source.firstPublishedAt : null, lastPublishedAt: typeof source.lastPublishedAt === "string" ? source.lastPublishedAt : null })) : [],
    claims: Array.isArray(data.claims) ? data.claims.filter((claim) => claim && typeof claim === "object").map((claim) => Object.freeze({ key: typeof claim.key === "string" ? claim.key : "", predicate: typeof claim.predicate === "string" ? claim.predicate : null, coverage: claim.coverage === "shared" ? "shared" : "source_only", observations: Array.isArray(claim.observations) ? claim.observations : [] })) : [],
    pagination: data.pagination && typeof data.pagination === "object" ? Object.freeze({ page: Number.isSafeInteger(Number(data.pagination.page)) ? Number(data.pagination.page) : 1, pages: Number.isSafeInteger(Number(data.pagination.pages)) ? Number(data.pagination.pages) : 0, total: Number.isSafeInteger(Number(data.pagination.total)) ? Number(data.pagination.total) : 0 }) : Object.freeze({ page: 1, pages: 0, total: 0 }),
  });
}
module.exports = { normalizeSourceComparisonResponse };
