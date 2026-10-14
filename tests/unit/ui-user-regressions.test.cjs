const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

test("profile avatar has immediate fallback and fixed frame geometry", () => {
  const profile = read("components/ProfileMenu.tsx");
  const css = read("styles/profile-badge.css");

  assert.match(profile, /avatar-fallback/);
  assert.match(profile, /failedAvatar/);

  assert.match(css, /flex:\s*0\s+0\s+44px/);
  assert.match(css, /\.profile-frame-overlay/);
  assert.match(css, /contain:\s*paint/);
});

test("premium route owns its header skin", () => {
  const header = read("components/Header.tsx");
  const css = read("app/globals.css");

  assert.match(header, /isPremiumRoute/);
  assert.match(header, /header-premium/);
  assert.match(css, /\.header-nav\.header-premium/);
});

test("recaptcha is not globally loaded", () => {
  const layout = read("app/layout.tsx");
  const client = read("components/recaptcha-client.ts");

  assert.doesNotMatch(layout, /google\.com\/recaptcha\/api\.js/);
  assert.match(client, /createElement\("iframe"\)/);
  assert.match(client, /frame\.remove\(\)/);
});

test("trends debug is absent and history identity is stable", () => {
  const filters = read("components/TrendsFilters.tsx");
  const panel = read("components/TrendsPanel.tsx");

  assert.doesNotMatch(filters, /TrendsDebug/);

  assert.match(panel, /function\s+trendIdentity/);
  assert.match(panel, /const historyKey\s*=\s*trendIdentity\(t\)/);
  assert.match(panel, /getDisplayHistory\(trend:\s*Trend\)/);
});

test("insights 24h empty state and clickbait window are enforced", () => {
  const heatmap = read("components/WhatHappenedTodayHeatmap.tsx");
  const clickbait = read("components/WSourceClickbait.tsx");
  const api = read("app/api/insights/clickbait/route.ts");
  const empty = read("components/InsightsEmptyState.tsx");

  assert.match(
    heatmap,
    /Number\(matrix\[c\]\?\.\[h\]\)\s*>\s*0/
  );

  assert.match(heatmap, /InsightsEmptyState period="24h"/);
  assert.match(clickbait, /clickbait\?period=/);

  assert.match(
    api,
    /created_at\s*>=\s*\?\s*AND\s*created_at\s*<\s*\?/
  );

  assert.match(empty, /Nincs megjeleníthető adat/);
});

test("premium redesign and original prices remain intact", () => {
  const premium = read("app/premium/page.tsx");

  assert.match(premium, /premium-intro/);
  assert.match(premium, /premium-features/);
  assert.match(premium, /premium-plan-featured/);

  assert.match(premium, /1000 Ft/);
  assert.match(premium, /9000 Ft/);
});