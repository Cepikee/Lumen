"use strict";

const { normalizeEntityName } = require("./entity-normalization");
const { CONTRACT_VERSIONS } = require("./contract-versions");

// Candidate generation is deliberately bounded. Advanced candidates are
// review-only until a later owner-approved semantic/AI policy exists.
const CANDIDATE_POLICY = Object.freeze({ limit: 20, tieMargin: 0.02 });

function tokens(value) {
  return String(value || "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function jaccard(left, right) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function candidateScore(input, candidate, context = {}) {
  const query = input.normalizedName;
  const name = candidate.normalizedName || candidate.normalized_name || "";
  const alias = candidate.normalizedAlias || candidate.normalized_alias || "";
  const exact = query === name || query === alias;
  const lexical = Math.max(jaccard(query, name), jaccard(query, alias));
  const prefix = name.startsWith(query) || alias.startsWith(query) ? 0.05 : 0;
  const typeMatch = candidate.entityType === input.entityType || candidate.entity_type === input.entityType;
  const languageMatch = String(candidate.language || "").toLowerCase() === input.language;
  const sourceMatch = Array.isArray(candidate.sourceIds) && context.sourceId != null
    && candidate.sourceIds.map(String).includes(String(context.sourceId));
  const contextBonus = sourceMatch ? 0.05 : 0;
  const raw = exact ? 1 : Math.min(0.94, lexical * 0.9 + prefix + contextBonus);
  return {
    ...candidate,
    entityId: Number(candidate.entityId ?? candidate.entity_id),
    score: Number(raw.toFixed(4)),
    evidence: Object.freeze({ exact, lexical: Number(lexical.toFixed(4)), prefix: Boolean(prefix), sourceMatch, typeMatch, languageMatch }),
  };
}

function rankCandidates(input, candidates, context = {}) {
  if (!input || typeof input !== "object") throw new TypeError("candidate_input_invalid");
  const normalized = normalizeEntityName(input.name, { language: input.language });
  if (normalized.status !== "valid") throw new TypeError(normalized.reason);
  const entityType = String(input.entityType || "").trim();
  if (!entityType) throw new TypeError("entity_type_invalid");
  const language = normalized.language;
  const ranked = (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate && Number.isSafeInteger(Number(candidate.entityId ?? candidate.entity_id)) && Number(candidate.entityId ?? candidate.entity_id) > 0)
    .filter((candidate) => (candidate.entityType || candidate.entity_type) === entityType)
    .filter((candidate) => String(candidate.language || "").toLowerCase() === language)
    .map((candidate) => candidateScore({ normalizedName: normalized.normalizedName, entityType, language }, candidate, context))
    .sort((a, b) => b.score - a.score || a.entityId - b.entityId);
  const top = ranked[0];
  const second = ranked[1];
  const tie = Boolean(top && second && top.score - second.score <= CANDIDATE_POLICY.tieMargin);
  return Object.freeze({
    status: !top ? "unresolved" : tie ? "ambiguous" : "review",
    resolutionStatus: !top ? "unresolved" : tie ? "ambiguous" : "review",
    matchType: "candidate",
    method: "deterministic_contextual",
    normalized: normalized.normalizedName,
    resolverVersion: CONTRACT_VERSIONS.resolver,
    confidence: top?.score ?? null,
    // Advanced candidates never bypass the M5/Q06 exact policy. A selected
    // candidate is only a review hint; persistence requires resolved_exact.
    selectedEntityId: null,
    candidates: ranked.slice(0, CANDIDATE_POLICY.limit),
    evidence: Object.freeze({ candidateCount: ranked.length, tie, context: { sourceId: context.sourceId ?? null } }),
  });
}

async function boundedDisambiguation(result, { resolver, context = {} } = {}) {
  if (!result || !Array.isArray(result.candidates) || !result.candidates.length || typeof resolver !== "function") {
    return Object.freeze({ ...result, aiStatus: "skipped", providerCalls: 0 });
  }
  const candidates = result.candidates.slice(0, CANDIDATE_POLICY.limit);
  const candidateIds = new Set(candidates.map((candidate) => Number(candidate.entityId)));
  const input = Object.freeze({
    mention: result.normalized,
    candidateIds: Object.freeze([...candidateIds]),
    context: Object.freeze({
      sourceId: context.sourceId ?? null,
      articleId: context.articleId ?? null,
      location: context.location ?? null,
      time: context.time ?? null,
    }),
  });
  let output;
  try {
    output = await resolver(input);
  } catch (error) {
    return Object.freeze({ ...result, aiStatus: "failed", aiError: String(error?.message || error).slice(0, 160), providerCalls: 1 });
  }
  const selected = Number(output?.entityId);
  const confidence = Number(output?.confidence);
  if (!candidateIds.has(selected) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return Object.freeze({ ...result, aiStatus: "invalid_output", providerCalls: 1, selectedEntityId: null });
  }
  // AI can provide a bounded review recommendation, but it cannot bypass
  // ambiguity or Q06 and therefore never becomes a persistable auto-link.
  return Object.freeze({ ...result, aiStatus: "review_recommendation", providerCalls: 1, method: "semantic_review", selectedEntityId: selected, confidence: Number(confidence.toFixed(4)), resolutionStatus: "review", status: "review" });
}

module.exports = { CANDIDATE_POLICY, boundedDisambiguation, candidateScore, rankCandidates, tokens, jaccard };
