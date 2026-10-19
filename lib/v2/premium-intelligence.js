"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const MAX_LIMIT = 100;

function positiveId(value, field) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`);
  return Number(value);
}

function validatePremiumInput(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { status: "invalid", errors: ["input_required"] };
  const errors = [];
  const hasEvent = input.eventId != null && String(input.eventId).trim() !== "";
  const hasClaim = input.claimId != null && String(input.claimId).trim() !== "";
  if (hasEvent === hasClaim) errors.push("exactly_one_scope_required");
  let eventId = null; let claimId = null;
  if (hasEvent) { try { eventId = positiveId(input.eventId, "event_id"); } catch (error) { errors.push(error.message); } }
  if (hasClaim) { try { claimId = positiveId(input.claimId, "claim_id"); } catch (error) { errors.push(error.message); } }
  const page = input.page == null ? 1 : Number(input.page);
  const limit = input.limit == null ? 50 : Number(input.limit);
  if (!Number.isSafeInteger(page) || page < 1) errors.push("page_invalid");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) errors.push("limit_invalid");
  return errors.length ? { status: "invalid", errors: [...new Set(errors)] } : { status: "valid", result: Object.freeze({ scope: eventId == null ? { type: "claim", id: claimId } : { type: "event", id: eventId }, page, limit }) };
}

function projectPremiumIntelligence({ scope, context, comparison, conflicts = [], conflictDetection = null, history = [] }) {
  if (!scope || !context) return { contractVersion: CONTRACT_VERSIONS.premiumIntelligence, status: "empty", scope: scope || null, context: null, sourceComparison: comparison || null, conflicts: [], conflictStatus: "empty", history: [] };
  return {
    contractVersion: CONTRACT_VERSIONS.premiumIntelligence,
    status: "ready",
    scope,
    context,
    sourceComparison: comparison,
    conflicts: conflicts.flatMap((conflict) => {
      if (!conflict || conflict.status !== "candidate" || conflict.automaticWinner !== null || !Array.isArray(conflict.evidence) || conflict.evidence.length < 2) return [];
      return [{ fingerprint: String(conflict.fingerprint), type: String(conflict.conflictType), reason: String(conflict.reason), state: String(conflict.state), severity: String(conflict.severity), sources: Array.isArray(conflict.sources) ? conflict.sources : [], claims: Array.isArray(conflict.claims) ? conflict.claims.map((claim) => ({ id: Number(claim.id), articleId: Number(claim.articleId), sourceId: Number(claim.sourceId), predicate: String(claim.predicate), value: claim.value ?? null, normalizedValue: claim.normalizedValue ?? null, polarity: claim.polarity, status: claim.status })) : [], evidence: conflict.evidence, temporal: conflict.temporal ?? null, attribution: conflict.attribution ?? [], automaticWinner: null }];
    }),
    conflictStatus: conflictDetection?.status === "ready" ? "ready" : conflictDetection?.status === "insufficient_evidence" ? "insufficient_evidence" : "empty",
    history: history.map((item) => ({ type: String(item.itemType), id: Number(item.itemId), validAt: item.validAt == null ? null : new Date(item.validAt).toISOString(), displayAt: item.displayAt == null ? null : new Date(item.displayAt).toISOString() })),
    redaction: { rawProviderOutput: false, internalAudit: false, confidenceMechanics: false, costInternals: false },
  };
}

module.exports = { MAX_LIMIT, validatePremiumInput, projectPremiumIntelligence };
