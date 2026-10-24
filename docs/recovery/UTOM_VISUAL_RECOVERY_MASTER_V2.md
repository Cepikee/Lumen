# UTOM visual recovery master V2

Date: 2026-10-23  
Branch: `develop/utom-recovery`  
Baseline HEAD: `b6a6ab1503974767e7601ad237ac654021b1a06e`  
Scope: homepage, Insights, Trends, their navigation rails, charts and filter interactions.

## Evidence and status policy

The previous recovery round was insufficient because green source-level tests did not prove rendered dimensions, clipping, scrolling, or browser state transitions. This round therefore uses three distinct evidence levels:

- `FIXED`: code and automated regression evidence exist.
- `VISUALLY_VERIFIED`: the repaired behavior was rendered and inspected in a disposable local Chrome profile.
- `PRODUCTION_VERIFIED`: only behavior actually rechecked at `https://utom.hu` after deployment may receive this status.

No local fix in this document is marked `PRODUCTION_VERIFIED`: this task does not deploy. Production was inspected read-only to reproduce the original state. The authenticated production Insights dashboard could not be opened without a production premium session, so its production visual verification remains blocked.

The browser harness uses same-origin, explicitly labelled representative responses and never changes production data. Its source is `scripts/visual-recovery-browser.cjs`; raw geometry is in `screenshots/visual-recovery-v2/dom-metrics.json`, and interaction evidence is in `screenshots/visual-recovery-v2/interaction-results.json`.

## Finding registry

### VR2-001 — Homepage navigation/category vertical void

- **Symptom:** several hundred pixels separated Navigation from Popular categories.
- **Area:** homepage, `HomeFeedLayout` left rail.
- **Cause:** the sticky CSS grid inherited viewport height and implicit rows that stretched to consume the unused height.
- **Files:** `components/HomeFeedLayout.module.css`.
- **Fix:** content-sized implicit rows (`grid-auto-rows:max-content`, `align-content:start`); removed the fixed/minimum left-rail height while retaining a viewport maximum.
- **Automatic test:** `tests/unit/visual-recovery-v2.test.cjs`.
- **Browser evidence:** `screenshots/visual-recovery-v2/home-desktop-1920x1080.png`, `home-wide-1440x1000.png`.
- **Risk:** must be checked again after production deployment with live category counts.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-002 — Homepage rails detached from long feed

- **Symptom:** the left and right rails disappeared from the usable viewport during a long feed scroll.
- **Area:** homepage rails.
- **Cause:** the rail height/overflow combination fought content sizing, and the shared page `<main>` created a non-scrolling `overflow:auto` ancestor that became the sticky containing block.
- **Files:** `components/HomeFeedLayout.module.css`, `components/ClientLayout.tsx`.
- **Fix:** sticky rails with header-aware offsets, viewport-bounded height and thin internal overflow only when the rail itself is taller than the viewport; the homepage uses document scrolling, and the right rail returns to normal flow below the desktop breakpoint.
- **Automatic test:** browser harness records the document scroll range and post-scroll rail rectangles.
- **Browser evidence:** `screenshots/visual-recovery-v2/home-scrolled-sticky-1440x1000.png` plus `interaction-results.json`.
- **Risk:** browser extensions or a changed production header height may require an offset adjustment.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-003 — Misleading `U` image placeholder

- **Symptom:** articles without generated or original images displayed a large letter U that looked like a broken asset.
- **Area:** homepage feed card.
- **Cause:** placeholder content was a single brand letter.
- **Files:** `components/FeedItemCard.tsx`, `components/NewsFeedCard.module.css`.
- **Fix:** accessible, neutral news-card illustration with the explicit label `Nincs illusztráció`; real image paths and image error fallback remain unchanged.
- **Automatic test:** existing homepage presentation contracts and browser harness.
- **Browser evidence:** all homepage screenshots; the scrolled desktop image contains multiple placeholders.
- **Risk:** none beyond final production asset-path verification.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-004 — Missing daily-use homepage categories

- **Symptom:** Culture, Health and Education were hidden from the primary list.
- **Area:** homepage category navigation.
- **Cause:** the primary category constant only listed five categories.
- **Files:** `components/HomeFeedLayout.tsx`.
- **Fix:** stable primary order now exposes Public affairs, Politics, Economy, Tech, Sport, Culture, Health and Education regardless of a zero count; truly additional values remain under the disclosure.
- **Automatic test:** `tests/unit/visual-recovery-v2.test.cjs` checks all nine choices including All news.
- **Browser evidence:** homepage screenshots and `interaction-results.json` list all primary labels.
- **Risk:** production DB display names must continue to use the canonical Hungarian category names.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-005 — Homepage source/category facet stability and count meaning

- **Symptom:** source/category choices could appear to vanish with pagination; `20 / total` was ambiguous.
- **Area:** homepage facets and Activity card.
- **Cause:** the historical fallback could infer navigation from the currently loaded page, while the UI did not state the aggregate contract clearly enough.
- **Files reviewed:** `app/page.tsx`, `app/api/feed-facets/route.ts`, `app/api/summaries/route.ts`, `components/HomeFeedLayout.tsx`.
- **Fix/evidence:** the current page consumes independent `public-feed-v1` facets. The first number is the currently rendered page size; the second is the filtered total of publishable AI summaries (`summaries.ai_clean=1`). Source identity accepts canonical active source IDs, slugs and names rather than fixed auto-increment assumptions.
- **Automatic test:** `tests/unit/frontend-data-correctness.test.cjs`.
- **Browser evidence:** local homepage shows `20 / 381` together with the definition; production read-only inspection showed the same seven-source navigation contract.
- **Risk:** no production database query was executed in this task; live totals can change and require post-deploy read-only comparison.
- **Status:** `VISUALLY_VERIFIED` locally; production count reconciliation remains `BLOCKED` pending deployment/read-only DB evidence.

### VR2-006 — Category trend collapsed to near-zero height

- **Symptom:** a large Insights card contained only a few pixels of chart.
- **Area:** Insights category trend.
- **Cause:** the grid card forced a fixed height while direct descendants were `flex:1; min-height:0`; Recharts responsive containers consequently measured zero height.
- **Files:** `components/InsightsDashboard.module.css`, `components/InsightsCharts.tsx`.
- **Fix:** content-sized cards, explicit 230px chart region, 450px expanded chart, thicker series and active points.
- **Automatic test:** static contract plus browser geometry; all Insights viewports report eight non-zero Recharts containers and zero zero-height charts.
- **Browser evidence:** `screenshots/visual-recovery-v2/insights-wide-1440x1200.png` and mobile/tablet variants.
- **Risk:** production premium screen is authentication-blocked in this session.
- **Status:** `VISUALLY_VERIFIED`; production `BLOCKED`.

### VR2-007 — Category series could not be isolated cleanly

- **Symptom:** heavy category boxes consumed space and a click navigated away instead of controlling the chart.
- **Area:** Insights category trend legend.
- **Cause:** legend actions conflated visibility and drill-down.
- **Files:** `components/InsightsCharts.tsx`, `components/InsightsDashboard.module.css`.
- **Fix:** compact color-matched chips independently toggle each series through `aria-pressed`; a separate arrow retains category drill-down. At least one series always stays visible.
- **Automatic test:** `tests/unit/visual-recovery-v2.test.cjs` and `insights-ux-regressions.test.cjs`.
- **Browser evidence:** Insights desktop/tablet screenshots.
- **Risk:** production chart data may expose longer category names; wrapping is enabled.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-008 — Clickbait bars without identifiable source labels

- **Symptom:** bars existed but labels were clipped or absent; insufficient samples were silent.
- **Area:** Insights source clickbait chart.
- **Cause:** fixed narrow Y-axis and a chart height unrelated to row count.
- **Files:** `components/InsightsCharts.tsx`, `components/InsightsDashboard.tsx`, `components/InsightsDashboard.module.css`.
- **Fix:** dynamic chart height, label-aware Y-axis width, `interval=0`, visible bar values, preserved sample-size detail, and an explicit insufficient-sample list.
- **Automatic test:** targeted Insights tests plus DOM chart geometry.
- **Browser evidence:** `insights-wide-1440x1200.png` shows seven labelled sources.
- **Risk:** source names wider than the bounded axis use the existing detail list and tooltip.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-009 — Sentiment donut text overlap

- **Symptom:** average sentiment, article count and percentages overlapped.
- **Area:** Insights sentiment distribution.
- **Cause:** undersized percentage-based donut box inside a constrained grid.
- **Files:** `components/InsightsDashboard.module.css`.
- **Fix:** fixed readable 180px donut, wider grid column, separate center value and legend/sample rows; mobile stacks safely.
- **Automatic test:** browser overflow/geometry sweep at 320–1920px.
- **Browser evidence:** `insights-wide-1440x1200.png`.
- **Risk:** production premium screen remains unavailable for post-deploy evidence.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-010 — Heatmap and sentiment timeline unreadable

- **Symptom:** tiny cells/labels and low charts made the hourly data unusable.
- **Area:** Insights hourly category activity and sentiment timeline.
- **Cause:** 13px cells, 85px label column and inherited compressed card height.
- **Files:** `components/InsightsDashboard.module.css`.
- **Fix:** 118px category labels, 19px focusable cells, readable hour ticks and scale, 230px standard chart height, and 450px expanded view.
- **Automatic test:** browser chart/overflow metrics across required breakpoints.
- **Browser evidence:** `insights-wide-1440x1200.png`, `insights-tablet-768x1100.png`.
- **Risk:** narrow view intentionally permits local heatmap scrolling instead of shrinking cells.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-011 — Trends source options incomplete and not URL-stable

- **Symptom:** production showed only Telex, 444 and Index in the Trends filter; reload could lose state.
- **Area:** Trends desktop/mobile filters.
- **Cause:** a local three-item constant and one-way component state initialization.
- **Files:** `components/TrendsDashboard.tsx`, `components/TrendsDashboard.module.css`, `components/TrendsIcon.tsx`.
- **Fix:** seven canonical source values (Telex, 24.hu, Index, HVG, Portfolio, 444.hu, Origo), URL hydration and replacement for period/source/category/sort/keyword/custom range, plus a mobile filter drawer.
- **Automatic test:** targeted test and browser interaction loop toggling all seven sources; Telex selection survives reload.
- **Browser evidence:** `trends-wide-1440x1000.png`, `trends-mobile-filters-open-390x844.png`, `interaction-results.json`.
- **Risk:** production API results for every source require deployment and live data.
- **Status:** `VISUALLY_VERIFIED`; production awaiting deployment.

### VR2-012 — Trends desktop rails and mobile filters inaccessible

- **Symptom:** long source/category lists were clipped; the page and filter scrolling competed.
- **Area:** Trends left/right rails and mobile filter experience.
- **Cause:** rail height was not consistently bounded, a non-scrolling `overflow:auto` wrapper blocked sticky positioning, and no small-screen filter surface exposed the hidden desktop controls.
- **Files:** `components/TrendsDashboard.module.css`, `components/TrendsDashboard.tsx`, `components/ClientLayout.tsx`.
- **Fix:** document scrolling plus sticky viewport-bounded rails with internal reachability on desktop; mobile trigger opens a vertically scrollable filter panel with aligned controls.
- **Automatic test:** viewport matrix and mobile-open screenshot capture.
- **Browser evidence:** desktop, 1024, 768, 390 and 320 Trends screenshots.
- **Risk:** a very small-height landscape phone needs a dedicated future usability pass.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-013 — Source distribution legend obscured names

- **Symptom:** colored bars covered names and only a subset of the sources was rendered.
- **Area:** Trends source-share card.
- **Cause:** side-by-side donut/legend density and `slice(0,5)` truncation.
- **Files:** `components/TrendsDashboard.tsx`, `components/TrendsDashboard.module.css`.
- **Fix:** stacked donut/legend, all API-provided sources, separate color/name/count/percentage columns, and a precise `Cikk–kulcsszó kapcsolatok forrásonként` unit.
- **Automatic test:** targeted presentation test and overflow sweep.
- **Browser evidence:** Trends desktop screenshots.
- **Risk:** no claim is made that a relationship count equals unique articles.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-014 — Misleading Trends activity and topic novelty

- **Symptom:** one tall activity bucket looked like a broken 30-day series; historical terms could be labelled simply `Új`; duplicate status chips added noise.
- **Area:** Trends activity card and topic rows.
- **Cause:** no one-bucket explanation and an import-first-seen concept was presented as historical novelty.
- **Files:** `components/TrendsDashboard.tsx`, `components/TrendsDashboard.module.css`.
- **Fix:** a one-bucket message explains the limited collection window and points to hourly 24h inspection; novelty now reads `Első észlelés` with its DB-first-seen definition; duplicate `Új aktivitás` is suppressed and source chips are bounded.
- **Automatic test:** `tests/unit/visual-recovery-v2.test.cjs`.
- **Browser evidence:** Trends desktop/open-card screenshots.
- **Risk:** semantic equivalence of separate keywords remains a backend data question; the UI only labels `Kapcsolódik` as separately measured topics and does not merge them.
- **Status:** `VISUALLY_VERIFIED`; semantic dedup production proof remains `BLOCKED`.

### VR2-015 — Trend card could not be reopened

- **Symptom:** after close, the same topic details sometimes would not open again.
- **Area:** Trends topic card/detail state.
- **Cause reviewed:** expanded identity state had to be driven consistently by the row, sparkline and chevron actions.
- **Files exercised:** `components/TrendsDashboard.tsx` and existing `TrendIntelligencePanel` flow.
- **Fix/evidence:** the shared identity toggle remains the single state source. The browser opens, closes and reopens the first card, then scrolls to and opens a second card.
- **Automatic test:** `interaction-results.json` records `opened=true`, `closed=false`, `reopened=true`, `secondOpened=true`.
- **Browser evidence:** `trends-card-reopened-1440x1000.png`.
- **Risk:** production response latency may change transition timing, not state semantics.
- **Status:** `VISUALLY_VERIFIED`.

### VR2-016 — Time-window semantics

- **Symptom:** “today”, rolling 24 hours and daily/clock buckets risked being interpreted as equivalent.
- **Area:** Insights and Trends API/client contracts.
- **Cause reviewed:** mixed host-time formatting had historically been a source of drift.
- **Files reviewed:** `lib/business-time.js`, `lib/insights-period.ts`, `lib/insights-intelligence.js`, `lib/insights-dashboard.ts`, `lib/trend-intelligence.ts`.
- **Fix/evidence:** existing contracts retain `Europe/Budapest`; Today is a Budapest calendar day, 24h is rolling, SQL bounds use half-open intervals, Insights grouping/labels use Budapest, and Trends 24h uses hourly resolution.
- **Automatic test:** existing `insights-period-host-timezone.test.cjs`, DST/business-time tests in the offline suite.
- **Browser evidence:** URL-backed period labels render in representative Insights/Trends captures.
- **Risk:** production DB session timezone still requires environment-level read-only verification after deployment.
- **Status:** `FIXED` by existing contract tests; production `BLOCKED`.

### VR2-017 — Compact navigation labels touching or clipping

- **Symptom:** at the tablet boundary the Insights links visually touched; on a 320–390px Trends viewport the active Trends label could be partially outside the initial view.
- **Area:** Insights shared header and Trends compact navigation.
- **Cause:** breakpoint overrides restored a flex navigation without a gap, while the four-item Trends row retained desktop padding.
- **Files:** `components/InsightsHeader.module.css`, `components/TrendsDashboard.module.css`.
- **Fix:** responsive explicit link spacing for Insights; smaller icon/gap/padding and width distribution for the four visible Trends links.
- **Automatic test:** required viewport browser matrix and horizontal-overflow measurement.
- **Browser evidence:** final 768px Insights and 390/320px Trends captures.
- **Risk:** translated labels longer than the present Hungarian strings may need a scrollable fallback.
- **Status:** `VISUALLY_VERIFIED`.

## Browser acceptance matrix

The final local matrix covers:

- Homepage: 1920×1080, 1440×1000, 1024×900, 390×844, 320×780, plus long-feed scrolled state.
- Insights: 1920×1080, 1440×1200, 1280×900, 768×1100, 390×844, 320×780.
- Trends: 1920×1080, 1440×1000, 1280×900, 1024×900, 768×1100, 390×844, 320×780, open/reopened card and mobile-filter states.

All 18 base pages report `horizontalOverflow: false`. Decorative SVG paths may extend outside their clipped art box; they do not enlarge the document or obscure controls. All eight Insights Recharts DOM nodes have a positive width/height at every tested Insights viewport.

## Production read-only findings

- Homepage production exposed all seven sources but still displayed the original layout/placeholder behavior before deployment. A visible `20 / 381` means loaded summaries versus the `ai_clean=1` filtered facet total, not the Insights rolling-window article count.
- Trends production reproduced the incomplete three-source filter and cramped source-share legend.
- Production Insights redirected to the Premium gate for this unauthenticated session. Its chart defects can therefore only be marked locally visually verified in this round.
- No production request mutated state, no paid AI/provider call was made, and no deployment, commit or push occurred.

## Remaining gates

1. Deploy only through a separately authorized release process.
2. Repeat the same screenshots against authenticated production, then promote eligible items from `VISUALLY_VERIFIED` to `PRODUCTION_VERIFIED`.
3. Verify production DB session timezone and the unique-article/source aggregation semantics read-only after deployment.

## Final quality-gate record

- Targeted frontend tests: `20/20 PASS`.
- Browser acceptance: `PASS` — 18 base viewport captures and 3 interaction-state captures; zero document-level horizontal overflow in the required matrix; all eight Insights Recharts nodes have positive dimensions.
- Offline suite: `1317 PASS / 0 FAIL / 1 environment SKIP` (`1318` total).
- TypeScript: `PASS` (`tsc --noEmit`).
- ESLint: `PASS` with `0 errors`; the repository still reports `420` non-blocking warnings that were outside this visual-recovery scope.
- Import check: `PASS` — every statically detectable local import resolves.
- Production build: `PASS` — Next.js `16.4.2`, `76/76` static pages generated.

