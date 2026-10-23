const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const business = require('../../lib/business-time');
const insights = require('../../lib/insights-intelligence');

test('Budapest calendar-day bounds preserve DST-short and DST-long days', () => {
  const spring = business.businessDayBounds(new Date('2026-03-29T12:00:00Z'));
  const autumn = business.businessDayBounds(new Date('2026-10-25T12:00:00Z'));
  assert.equal(spring.end - spring.start, 23 * 60 * 60 * 1000);
  assert.equal(autumn.end - autumn.start, 25 * 60 * 60 * 1000);
});

test('Insights distinguishes the Budapest calendar day from rolling 24 hours', () => {
  const now = Date.parse('2026-10-23T12:34:00Z');
  const today = insights.queryOptions(new URLSearchParams('period=today'), now);
  const rolling = insights.queryOptions(new URLSearchParams('period=24h'), now);
  assert.equal(new Date(today.start).toISOString(), '2026-10-22T22:00:00.000Z');
  assert.equal(today.end, Date.parse('2026-10-23T12:34:00Z'));
  assert.equal(rolling.end - rolling.start, 24 * 60 * 60 * 1000);
  assert.notEqual(today.start, rolling.start);
});

test('homepage facets are independent of the currently loaded page and expose one count contract', () => {
  const layout = fs.readFileSync('components/HomeFeedLayout.tsx', 'utf8');
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  const route = fs.readFileSync('app/api/feed-facets/route.ts', 'utf8');
  assert.match(page, /\/api\/feed-facets/);
  assert.match(layout, /facets\.categories/);
  assert.match(layout, /facets\.sources/);
  assert.match(layout, /Megjelenítve/);
  assert.match(route, /contract: "public-feed-v1"/);
  assert.match(route, /Publikálható AI-összefoglalók \(ai_clean=1\)/);
  assert.match(route, /GROUP BY src\.id, src\.slug, src\.name/);
  assert.match(route, /GROUP BY TRIM\(su\.category\)/);
});

test('unknown future RSS source names are resolved from the canonical source registry', () => {
  const summaries = fs.readFileSync('app/api/summaries/route.ts', 'utf8');
  assert.match(summaries, /SELECT id FROM sources/);
  assert.match(summaries, /LOWER\(TRIM\(slug\)\)/);
  assert.match(summaries, /LOWER\(TRIM\(name\)\)/);
  assert.match(summaries, /is_active = 1/);
});
