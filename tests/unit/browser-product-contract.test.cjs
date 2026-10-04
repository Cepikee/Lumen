"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const relatedRoute = fs.readFileSync(
  path.join(__dirname, "../../app/api/related/route.ts"),
  "utf8",
);
const categoryPage = fs.readFileSync(
  path.join(__dirname, "../../app/insights/category/[category]/page.tsx"),
  "utf8",
);
const categoryRoute = fs.readFileSync(
  path.join(__dirname, "../../app/api/insights/category/[category]/route.ts"),
  "utf8",
);
const globalCss = fs.readFileSync(
  path.join(__dirname, "../../app/globals.css"),
  "utf8",
);
const header = fs.readFileSync(
  path.join(__dirname, "../../components/Header.tsx"),
  "utf8",
);
const clientLayout = fs.readFileSync(
  path.join(__dirname, "../../components/ClientLayout.tsx"),
  "utf8",
);

test("article related route accepts every canonical source identity", () => {
  for (const source of ["telex.hu", "24.hu", "index.hu", "hvg.hu", "portfolio.hu", "444.hu", "origo.hu"]) {
    assert.ok(relatedRoute.includes(`"${source}"`), `missing canonical source ${source}`);
  }
  assert.match(relatedRoute, /normalizeRelatedSource\(searchParams\.get\("source"\)\)/);
});

test("category insights renders entitlement errors instead of a generic network failure", () => {
  assert.match(categoryPage, /res\.status === 401/);
  assert.match(categoryPage, /res\.status === 403/);
  assert.match(categoryPage, /Prémium előfizetéssel érhető el/);
  assert.match(categoryPage, /A kategóriai elemzésekhez jelentkezz be/);
  assert.match(categoryPage, /const controller = new AbortController\(\)/);
  assert.match(categoryPage, /signal: controller\.signal/);
  assert.match(categoryPage, /controller\.abort\(\)/);
});

test("category insights API resolves Next dynamic params before reading category", () => {
  assert.match(categoryRoute, /const resolvedParams = context\?\.params/);
  assert.match(categoryRoute, /await context\.params/);
  assert.match(categoryRoute, /const rawFromContext = resolvedParams\?\.category/);
  assert.doesNotMatch(categoryRoute, /const rawFromContext = context\?\.params\?\.category/);
});

test("mobile header wraps search instead of forcing horizontal overflow", () => {
  assert.match(globalCss, /@media \(max-width: 991\.98px\)/);
  assert.match(globalCss, /\.header-nav \.search-wrapper[\s\S]*?flex: 1 0 100%/);
  assert.match(globalCss, /\.header-nav \.navbar-nav[\s\S]*?display: none !important/);
});

test("header auth state uses the shared store loader without a duplicate auth probe", () => {
  assert.doesNotMatch(header, /fetch\("\/api\/auth\/me"/);
  assert.doesNotMatch(clientLayout, /loadUser\(\);/);
  assert.match(header, /useUserStore\.getState\(\)\.loadUser/);
});

console.log("browser product contract regression: PASS");
