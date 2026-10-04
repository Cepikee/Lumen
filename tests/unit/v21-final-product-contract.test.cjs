"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const rootLayout = fs.readFileSync("app/layout.tsx", "utf8");
const articleLayout = fs.readFileSync("app/cikk/[id]/layout.tsx", "utf8");
const premiumPage = fs.readFileSync("app/premium/page.tsx", "utf8");
const robots = fs.readFileSync("app/robots.ts", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");

test("SEO metadata uses configured canonical base and an existing image", () => {
  assert.match(rootLayout, /url: appUrl/);
  assert.doesNotMatch(rootLayout, /og-image\.png/);
  assert.match(rootLayout, /utom\.png/);
  assert.ok(rootLayout.includes('alternates: { canonical: "/" }'));
});

test("article SEO emits data-backed metadata and JSON-LD only", () => {
  assert.match(articleLayout, /SELECT id,title,content,url,created_at,updated_at FROM summaries/);
  assert.match(articleLayout, /NewsArticle/);
  assert.match(articleLayout, /datePublished/);
  assert.doesNotMatch(articleLayout, /author:/);
  assert.doesNotMatch(articleLayout, /image:/);
  assert.match(articleLayout, /robots: \{ index: false, follow: false \}/);
});

test("sitemap and robots exclude private operational routes", () => {
  assert.ok(sitemap.includes("summaries WHERE id > 0"));
  assert.doesNotMatch(sitemap, /api\//);
  assert.ok(robots.includes('"/api/"'));
  assert.ok(robots.includes("reset-password"));
  assert.ok(robots.includes("premium"));
});

test("Premium page describes implemented value and keeps provider actions disabled", () => {
  assert.match(premiumPage, /Előzmények és idővonal/);
  assert.match(premiumPage, /Források összehasonlítása/);
  assert.match(premiumPage, /Közös és eltérő állítások/);
  assert.match(premiumPage, /disabled aria-disabled="true"/);
  for (const unsupported of ["Fake Detektor", "Prémium Chat Szoba", "Közösségi Vélemény", "Forrás DNS"]) {
    assert.doesNotMatch(premiumPage, new RegExp(unsupported));
  }
});

console.log("V2.1 final product contract regression: PASS");
