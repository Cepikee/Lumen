"use strict";

// Benchmark adapter only. Extraction decisions are shared with controlled
// canonical-provider tests through a gold-independent V2 semantic helper.
const semantic = require("../v2/deterministic-semantic");

function extractEntities(text) {
  return semantic.extractEntities(text).map((entity) => ({ mention: entity.mention, normalized: entity.normalized, type: entity.type, identity: entity.identity }));
}
function extractClaims(article) {
  const source = article?.source?.key || article?.source || "";
  const claims = semantic.extractClaims(article?.text || "", source);
  return claims.filter((claim, index, all) => {
    if (!/^(?:beszámoló|helyi szereplők|közlemény|szerkesztőség)$/iu.test(String(claim.attribution?.label || ""))) return true;
    return !all.some((candidate, candidateIndex) => candidateIndex !== index
      && candidate.source === claim.source
      && candidate.predicate === claim.predicate
      && JSON.stringify(candidate.value) === JSON.stringify(claim.value)
      && candidate.unit === claim.unit
      && !/^(?:beszámoló|helyi szereplők|közlemény|szerkesztőség)$/iu.test(String(candidate.attribution?.label || "")));
  });
}
function predictArticle(article) {
  const text = article?.text || "";
  const entities = extractEntities(text);
  return { source: article?.source?.key || article?.source || "", entities, claims: extractClaims(article), relations: semantic.extractRelations(text, []), events: [], conflicts: [], changes: [], omissions: [] };
}
function predictArticles(articles) {
  const scenarios = [];
  for (const scenario of Array.isArray(articles?.scenarios) ? articles.scenarios : []) {
    const combined = { id: scenario.id, entities: [], claims: [], relations: [], events: [], conflicts: [], changes: [], omissions: [] };
    for (const article of Array.isArray(scenario.sourceVariants) ? scenario.sourceVariants : []) {
      const prediction = predictArticle(article);
      combined.entities.push(...prediction.entities);
      combined.claims.push(...prediction.claims);
      combined.relations.push(...prediction.relations);
    }
    scenarios.push(combined);
  }
  return { scenarios };
}
module.exports = { extractEntities, extractClaims, predictArticle, predictArticles };
