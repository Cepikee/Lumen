"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const articlePanel = fs.readFileSync("components/V2ArticleContextPanel.tsx", "utf8");
const articleHook = fs.readFileSync("hooks/useV2ArticleContext.ts", "utf8");
const premiumRoute = fs.readFileSync("app/api/v2/premium/intelligence/route.ts", "utf8");
const backfillRuntime = fs.readFileSync("lib/v2/incremental-backfill-runtime.js", "utf8");
const contextRoute = fs.readFileSync("app/api/v2/articles/[id]/context/route.ts", "utf8");
const integrationPanels = fs.readFileSync("components/V2ArticleIntegrationPanels.tsx", "utf8");
const sourcePanel = fs.readFileSync("components/V2SourceComparisonPanel.tsx", "utf8");
const premiumPanel = fs.readFileSync("components/V2PremiumIntelligencePanel.tsx", "utf8");
const security = fs.readFileSync("lib/security.ts", "utf8");
const { normalizeArticleContextResponse } = require("../../lib/v2/article-context-client.js");
const { normalizeSourceComparisonResponse } = require("../../lib/v2/source-comparison-client.js");
const { normalizePremiumIntelligenceResponse } = require("../../lib/v2/premium-intelligence-client.js");
test("M18 integration gate preserves feature and entitlement boundaries", () => {
  assert.match(articleHook, /isFrontendV2Enabled/);
  assert.match(articleHook, /AbortController/);
  assert.match(articleHook, /response\.ok/);
  assert.match(articlePanel, /loading|error|Nincs további kontextus/);
  assert.match(premiumRoute, /getCurrentPremiumEntitlement/);
  assert.match(premiumRoute, /!entitlement\.active/);
  assert.match(backfillRuntime, /isV2Enabled/);
});
test("M18 integration gate does not invent provider or payment behavior", () => {
  assert.doesNotMatch(premiumRoute, /openai|stripe|payment|upgrade/i);
  assert.doesNotMatch(backfillRuntime, /fetch\(|openai|provider/i);
});
test("M18 article integration exposes event choices and never selects a multi-event first item", () => {
  assert.match(contextRoute, /events:/);
  assert.match(integrationPanels, /events\.length === 1/);
  assert.match(sourcePanel, /Válassz eseményt/);
  assert.match(sourcePanel, /selectedEventId/);
  assert.doesNotMatch(sourcePanel, /status === "disabled" \|\| state\.status === "idle"/);
  assert.doesNotMatch(articlePanel, /useV2ArticleContext\(/);
  assert.match(integrationPanels, /const context = useV2ArticleContext\(/);
});
test("M18 normalizers fail closed and preserve empty datasets", () => {
  const context = normalizeArticleContextResponse({ data: { article: { id: 7 }, events: null, timeline: null } });
  assert.deepEqual(context.events, []);
  const comparison = normalizeSourceComparisonResponse({ data: { sources: null, claims: null } });
  assert.deepEqual(comparison.sources, []);
  assert.deepEqual(comparison.claims, []);
  const premium = normalizePremiumIntelligenceResponse({ data: { status: "empty", conflicts: null, history: null } });
  assert.equal(premium.status, "empty");
  assert.deepEqual(premium.conflicts, []);
  assert.deepEqual(premium.history, []);
});
test("M18 premium panel renders entitlement states without payment CTA", () => {
  assert.match(premiumPanel, /401/);
  assert.match(premiumPanel, /403/);
  assert.doesNotMatch(premiumPanel, /fizess|előfizetés vásárlása|upgrade|stripe/i);
});
test("M18 browser read routes allow only same-origin reads without exposing an API key", () => {
  assert.match(security, /allowSameOriginRead/);
  assert.match(security, /sec-fetch-site.*same-origin/);
  assert.match(security, /req\.method === "GET"/);
  assert.match(security, /originMatchesRequest/);
  assert.match(security, /origin === null/);
  assert.match(security, /refererMatchesRequest/);
  assert.match(security, /export function isAllowedSameOriginRead/);
  assert.match(security, /configuredOrigins\.includes\(origin\)/);
  assert.match(security, /new URL\(req\.url\)\.origin/);
  assert.match(contextRoute, /allowSameOriginRead/);
  assert.match(premiumRoute, /allowSameOriginRead/);
  const sourceRoute = fs.readFileSync("app/api/v2/source-comparison/route.ts", "utf8");
  assert.match(sourceRoute, /allowSameOriginRead/);
  const optInRoutes = [
    contextRoute,
    premiumRoute,
    sourceRoute,
  ];
  assert.equal(optInRoutes.filter((route) => route.includes("allowSameOriginRead: true")).length, 3);
  assert.doesNotMatch(security, /allowSameOriginRead[^\n]*req\.method !== "GET"/);
  assert.match(security, /if \(!checkApiKey\(req\) && !sameOriginRead\)/);
});
console.log("M18 integration gate contract regression: PASS");
