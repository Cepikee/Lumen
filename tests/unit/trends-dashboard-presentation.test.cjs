const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const dashboard = fs.readFileSync(path.join(root, "components", "TrendsDashboard.tsx"), "utf8");
const globe = fs.readFileSync(path.join(root, "components", "TrendsHeroGlobe.tsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "components", "TrendsDashboard.module.css"), "utf8");
const page = fs.readFileSync(path.join(root, "app", "trends", "page.tsx"), "utf8");
const layout = fs.readFileSync(path.join(root, "components", "ClientLayout.tsx"), "utf8");

test("trends route owns the reference dashboard shell", () => {
  assert.match(page, /<TrendsDashboard\s*\/>/);
  assert.match(layout, /pathname === "\/trends"/);
  assert.match(dashboard, /<TrendsHeroGlobe\s*\/>/);
  assert.match(dashboard, /Top növekvő témák/);
  assert.match(dashboard, /Források megoszlása/);
  assert.match(styles, /grid-template-columns:\s*180px minmax\(0, 1fr\)/);
  assert.match(globe, /globeArtwork/);
  assert.match(globe, /trends-land-dots/);
  assert.match(globe, /inside\(lon, lat, p\)/);
});

test("trends redesign keeps real endpoints, fail-safe states and honest fallbacks", () => {
  assert.match(dashboard, /fetch\(`\/api\/trends\?\$\{query\}`/);
  assert.match(dashboard, /fetch\(`\/api\/trend-history\?\$\{query\}`/);
  assert.match(dashboard, /\/api\/trends\/trend-sources\?keyword=/);
  assert.match(dashboard, /trends_invalid_response/);
  assert.match(dashboard, /data-state="preview"/);
  assert.match(dashboard, /A trendadatok most nem érhetők el/);
  assert.match(dashboard, /Array\.from\(\{ length: 8 \}/);
  assert.match(dashboard, /user \? <ProfileMenu \/> : <LoginModal \/>/);
  assert.doesNotMatch(dashboard, /Telex[^\n]*38%|Index[^\n]*28%|444[^\n]*22%/);
});

test("trends dashboard preserves filters, keyboard access and responsive layouts", () => {
  for (const token of ["period", "sources", "categories", "sort", "keyword", "startDate", "endDate"]) {
    assert.match(dashboard, new RegExp(`\\b${token}\\b`));
  }
  assert.match(dashboard, /event\.ctrlKey \|\| event\.metaKey/);
  assert.match(dashboard, /aria-expanded=/);
  assert.match(dashboard, /aria-live="polite"/);
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
