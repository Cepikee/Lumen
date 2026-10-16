const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('Insights period is URL-backed and survives category navigation', () => {
  const dashboard = read('components/InsightsDashboard.tsx');
  const category = read('app/insights/category/[category]/page.tsx');
  assert.match(dashboard, /useSearchParams/);
  assert.match(dashboard, /utom\.insights\.period/);
  assert.match(dashboard, /\?period=\$\{encodeURIComponent\(period\)\}/);
  assert.match(category, /period === "24h"/);
  assert.match(category, /setPeriod\("24h"\)/);
});

test('dark Insights chart tooltips stay readable and hover cursor does not gray the chart', () => {
  const charts = read('components/InsightsCharts.tsx');
  const css = read('components/InsightsDashboard.module.css');
  assert.match(charts, /const tipItem = \{ color: "#eef6ff" \}/);
  assert.match(charts, /cursor=\{false\}/);
  assert.match(charts, /\{data\.total\} elemzett cikk alapján/);
  assert.match(css, /recharts-tooltip-item[^\n]+#eef6ff/);
});

test('detailed clickbait charts are compact and expose sample sizes', () => {
  const score = read('components/WSourceClickbait.tsx');
  const ratio = read('components/WSourceClickbaitRatio.tsx');
  assert.doesNotMatch(ratio, /h-\[440px\]/);
  assert.match(score, /embedded = false/);
  assert.match(ratio, /embedded = false/);
  assert.match(score, /articles/);
  assert.match(ratio, /clickbait/);
  assert.match(ratio, /total/);
  assert.match(score, /Math\.min\(260, Math\.max\(150/);
  assert.match(ratio, /Math\.min\(280, Math\.max\(160/);
});

test('information icons open explanations and forecast empty state is understandable', () => {
  const dashboard = read('components/InsightsDashboard.tsx');
  assert.match(dashboard, /onClick=\{\(\) => setOpenInfo\(true\)\}/);
  assert.match(dashboard, /title=\{`\$\{title\} – mit mutat\?`\}/);
  assert.match(dashboard, /Nincs elegendő adat vagy sikeres futás/);
  assert.match(dashboard, /Statisztikai baseline/);
});
