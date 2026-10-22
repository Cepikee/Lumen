"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "..");

const {
  SOURCE_POLICIES,
  directFetchDecision,
  assertDirectArticleFetchAllowed,
  assertFeedProcessingAllowed,
} = require("../../lib/source-policy");
const { assessContentOverlap } = require("../../lib/content-overlap");

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("canonical sources have explicit review, fetch and external-image policies", () => {
  assert.deepEqual(Object.keys(SOURCE_POLICIES).sort(), [
    "24.hu", "444.hu", "hvg.hu", "index.hu", "origo.hu", "portfolio.hu", "telex.hu",
  ]);
  for (const policy of Object.values(SOURCE_POLICIES)) {
    assert.equal(policy.manualApprovalRequired, true);
    assert.equal(policy.reviewStatus, "legal_review_required");
    assert.equal(policy.externalImages, "deny_without_documented_rights");
    assert.match(policy.termsUrl, /^https:\/\//);
  }
});

test("source policy remains advisory for registered and unregistered public sources", () => {
  assert.equal(assertDirectArticleFetchAllowed("https://telex.hu/belfold/example").allowed, true);
  assert.deepEqual(directFetchDecision("https://example.org/article"), {
    allowed: true,
    reason: "source_policy_unregistered",
  });
  assert.equal(assertDirectArticleFetchAllowed("https://example.org/article").allowed, true);
  assert.deepEqual(assertFeedProcessingAllowed("example.org"), { source: null, policy: null });
});

test("documented source restrictions remain recorded without becoming download gates", () => {
  assert.equal(directFetchDecision("https://444.hu/2026/10/22/example").reason, "source_policy_recorded");
  assert.equal(directFetchDecision("https://444.hu/2026/10/22/example").allowed, true);
  assert.equal(assertFeedProcessingAllowed("444.hu").source.key, "444.hu");
});

test("network paths use safe-fetch rather than legal-registry allowlisting", () => {
  for (const file of ["app/api/analyze/route.ts", "app/api/fetch-feed/route.ts", "pipeline/scrapeArticle.js"]) {
    const source = read(file);
    assert.match(source, /fetchPinnedText/);
    assert.doesNotMatch(source, /assertDirectArticleFetchAllowed|assertFeedProcessingAllowed|directFetchDecision/);
  }
});

test("long verbatim spans and exact sentences require publication review", () => {
  const source = "A kutatócsoport kedden tette közzé a részletes jelentést, amely tizennyolc hónap adatait értékelte. A következtetések több lehetséges magyarázatot is felsorolnak.";
  const copied = "A kutatócsoport kedden tette közzé a részletes jelentést, amely tizennyolc hónap adatait értékelte. Ezután további elemzés következik.";
  const result = assessContentOverlap(source, copied);
  assert.equal(result.reviewRequired, true);
  assert.ok(result.reasons.includes("exact_sentence_overlap") || result.reasons.includes("long_verbatim_span"));
});

test("independently worded synthetic summary remains publishable", () => {
  const source = "A városi közgyűlés kedden elfogadta a következő év közlekedési keretét. A döntés alapján új autóbuszok érkeznek, ha a közbeszerzés eredményes lesz.";
  const summary = "A testület jóváhagyta a jövő évi közlekedési pénzügyi tervet. Az autóbusz-beszerzés megvalósulása a közbeszerzés sikerétől függ.";
  assert.equal(assessContentOverlap(source, summary).reviewRequired, false);
});

test("quoted source overlap is reported separately", () => {
  const quote = "a rendszer csak a független vizsgálat teljes befejezése után indulhat újra biztonságosan megfelelően";
  const result = assessContentOverlap(`A szóvivő szerint ${quote}.`, `A közlemény így fogalmazott: „${quote}”.`);
  assert.equal(result.directQuoteMatchCount, 1);
  assert.equal(result.reviewRequired, true);
  assert.ok(result.reasons.includes("long_direct_quote_overlap"));
});

test("public summary queries enforce ai_clean and pipeline persists the review gate", () => {
  const route = read("app/api/summaries/route.ts");
  assert.ok((route.match(/s\.ai_clean = 1/g) || []).length >= 4);
  const pipeline = read("pipeline/cron.js");
  assert.match(pipeline, /publicationReviewRequired \? 0 : 1/);
  assert.match(pipeline, /reviewReasons/);
});

test("analytics requires an affirmative consent decision", () => {
  const analytics = read("components/Analytics.tsx");
  const consent = read("components/CookieConsent.tsx");
  assert.match(analytics, /localStorage\.getItem\(CONSENT_KEY\) === "accepted"/);
  assert.match(analytics, /!enabled \|\| !consented/);
  assert.match(consent, /"rejected"/);
  assert.match(consent, /Csak szükséges/);
});

test("raw-text deletion execution requires policy approval and explicit windows", () => {
  const script = read("scripts/raw-text-retention.cjs");
  assert.match(script, /UTOM_RAW_TEXT_POLICY_APPROVED/);
  assert.match(script, /UTOM_RAW_TEXT_SUCCESS_HOURS/);
  assert.match(script, /UTOM_RAW_TEXT_FAILED_DAYS/);
});

test("legal and correction messages reach the real contact intake", () => {
  const route = read("app/api/contact/route.ts");
  const page = read("app/kapcsolat/page.tsx");
  assert.match(route, /copyright: "Szerzői jogi kifogás"/);
  assert.match(route, /correction: "Helyesbítési kérelem"/);
  assert.match(page, /value="copyright"/);
  assert.match(page, /value="correction"/);
  assert.match(route, /to,\s*subject:/);
});

test("technical legal copy no longer claims RSS-only operation or automatic regeneration", () => {
  const terms = read("components/TermsAndDisclosure.tsx");
  assert.doesNotMatch(terms, /kizárólag nyilvánosan elérhető RSS/);
  assert.doesNotMatch(terms, /automatikusan újragenerálásra kerül/);
  assert.match(terms, /publikációs ellenőrzési állapotba kerül/);
});
