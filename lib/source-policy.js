"use strict";

const { normalizeSourceIdentity, sourceIdentityFromUrl } = require("./source-identity");

// This registry records legal review evidence only. It does not grant a
// copyright licence and it is not a network allowlist. Network access remains
// governed by safe-fetch (SSRF, DNS pinning, redirects, ports and body limits).
const SOURCE_POLICIES = Object.freeze({
  "telex.hu": policy("https://telex.hu/dokumentum/altalanos-szerzodesi-feltetelek"),
  "24.hu": policy("https://24.hu/felhasznalasi-feltetelek-20250410/"),
  "index.hu": policy("https://index.hu/impresszum/", { machineRestriction: "AI crawler restrictions present in robots.txt" }),
  "hvg.hu": policy("https://cdn.hvg.hu/assets/hvghu/documents/HVG-ASZF-2026-04-13.pdf"),
  "portfolio.hu": policy("https://www.portfolio.hu/info/szerzoi-jogok", { knownRestriction: "explicit copyright and reuse restrictions" }),
  "444.hu": policy("https://444.hu/alapelveink", { feedContent: "full_feed_content" }),
  "origo.hu": policy("https://www.origo.hu/cimke/impresszum-2"),
});

function policy(termsUrl, overrides = {}) {
  return Object.freeze({
    reviewStatus: "legal_review_required",
    manualApprovalRequired: true,
    feedMetadata: "allow",
    feedContent: "legacy_feed_content",
    directArticleFetch: "observe_only",
    externalImages: "deny_without_documented_rights",
    termsUrl,
    machineRestriction: "see robots.txt; robots is not a licence",
    knownRestriction: "rights basis not verified in repository",
    checkedAt: "2026-10-22",
    ...overrides,
  });
}

function sourcePolicyForIdentity(value) {
  const source = normalizeSourceIdentity(value);
  return source ? { source, policy: SOURCE_POLICIES[source.key] || null } : null;
}

function sourcePolicyForUrl(value) {
  const source = sourceIdentityFromUrl(value);
  return source ? { source, policy: SOURCE_POLICIES[source.key] || null } : null;
}

function directFetchDecision(value) {
  const resolved = sourcePolicyForUrl(value);
  return Object.freeze({
    allowed: true,
    reason: resolved?.policy ? "source_policy_recorded" : "source_policy_unregistered",
    ...(resolved || {}),
  });
}

function assertDirectArticleFetchAllowed(value) {
  const decision = directFetchDecision(value);
  if (!decision.allowed) {
    const error = new Error(decision.reason);
    error.code = decision.reason;
    throw error;
  }
  return decision;
}

function assertFeedProcessingAllowed(value) {
  const resolved = sourcePolicyForIdentity(value);
  return resolved || { source: null, policy: null };
}

module.exports = {
  SOURCE_POLICIES,
  sourcePolicyForIdentity,
  sourcePolicyForUrl,
  directFetchDecision,
  assertDirectArticleFetchAllowed,
  assertFeedProcessingAllowed,
};
