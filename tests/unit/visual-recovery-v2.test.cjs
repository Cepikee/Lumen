const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("homepage recovery keeps the nine primary feed choices and content-sized sticky rails", () => {
  const layout = read("components/HomeFeedLayout.tsx");
  const css = read("components/HomeFeedLayout.module.css");
  const shell = read("components/ClientLayout.tsx");
  for (const label of ["Összes hír", "Közélet", "Politika", "Gazdaság", "Tech", "Sport", "Kultúra", "Egészségügy", "Oktatás"]) {
    assert.match(layout, new RegExp(label));
  }
  assert.match(css, /align-content:start/);
  assert.match(css, /grid-auto-rows:max-content/);
  assert.match(css, /position:sticky/);
  assert.match(css, /overflow-y:auto/);
  assert.match(shell, /if \(isTrends\)[\s\S]*className="flex-grow-1 p-0"/);
  assert.match(shell, /FŐOLDAL[\s\S]*className="flex-grow-1 p-0"/);
});

test("trends recovery exposes all canonical sources and persists filter state in the URL", () => {
  const dashboard = read("components/TrendsDashboard.tsx");
  for (const source of ["telex.hu", "24.hu", "index.hu", "hvg.hu", "portfolio.hu", "444.hu", "origo.hu"]) {
    assert.match(dashboard, new RegExp(source.replace(".", "\\.")));
  }
  assert.match(dashboard, /history\.replaceState/);
  assert.match(dashboard, /query\.get\("sources"\)/);
  assert.match(dashboard, /mobileFilterPanel/);
  assert.match(dashboard, /Cikk–kulcsszó kapcsolatok forrásonként/);
  assert.match(dashboard, /Első észlelés/);
  const styles = read("components/TrendsDashboard.module.css");
  assert.match(styles, /max-width:1080px\) and \(min-width:821px/);
  assert.match(styles, /grid-template-columns:42px minmax\(0,1fr\) 104px 94px 32px/);
});

test("insights recovery gives charts measurable height, source labels, and independent category toggles", () => {
  const charts = read("components/InsightsCharts.tsx");
  const dashboard = read("components/InsightsDashboard.tsx");
  const css = read("components/InsightsDashboard.module.css");
  assert.match(charts, /aria-pressed=/);
  assert.match(charts, /LabelList/);
  assert.match(charts, /unavailable/);
  assert.match(dashboard, /unavailableClickbaitSources/);
  assert.match(css, /height:230px/);
  assert.match(css, /height:450px/);
  assert.match(css, /flex:\s*none/);
  assert.match(css, /grid-template-columns:\s*118px/);
});

test("browser acceptance harness covers every required viewport and interaction evidence", () => {
  const harness = read("scripts/visual-recovery-browser.cjs");
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    assert.match(harness, new RegExp(`width:${width}\\b`));
  }
  assert.match(harness, /horizontalOverflow/);
  assert.match(harness, /home-scrolled-sticky/);
  assert.match(harness, /trends-card-reopened/);
  assert.match(harness, /trends-mobile-filters-open/);
  assert.match(harness, /sourceOptions/);
  assert.match(harness, /secondOpened/);
});
