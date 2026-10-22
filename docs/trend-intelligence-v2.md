# Trend Intelligence V2 — implementation and acceptance evidence

## Scope and original audit

The existing `/trends` shell, globe, profile/auth, navigation, filters and URL history are preserved. No pipeline activation, migration, production writes, paid services, commit, push or deployment.

The old system had three chart implementations: `SparklineMini`, `SparklineDetailed`, and `TrendChartModal`, while the active dashboard used a fourth SVG implementation. Single observations were duplicated to create lines. Detailed period selection filtered already-downloaded points rather than fetching the requested interval. The old 24h history grouped by hour-of-day, losing date ordering; list and history counted different things across periods. Zero previous activity became a misleading 100% growth. Category was absent from the history cache identity.

## Versioned canonical contract

The active dashboard now requests `contract=v2` on `/api/trends`, `/api/trend-history`, and `/api/trends/trend-sources`. Existing unversioned consumers retain their legacy response and semantics; they are not silently migrated. The v2 service is shared by all three endpoints.

Unit: **one retained article–keyword–category association**, deduplicated by article ID, keyword and category using the earliest retained keyword observation. Source is the article's current source; missing source is explicitly labelled. Category falls back from keyword category to article category, then `Egyéb`. Legacy `trends` snapshots without article provenance are excluded. This is neither raw textual mention count nor unique article count across multiple keywords. SQL collation determines keyword equality.

Every point includes absolute UTC `timestamp`, exclusive `end`, `freq`, and per-source counts. Total equals the sum of point values; each point equals its source sum. History identity includes category. An ambiguous category request fails instead of merging categories. Article drilldown uses exactly the same observation bounds and filters, not publication dates; publication time is displayed separately.

Time windows: 24h = last 24 completed UTC hours. 7/30/90/365 days = UTC calendar days including the current partial day. Custom dates are inclusive UTC dates, at most 366 days, with end clamped to the request anchor. Previous comparison is the immediately preceding interval of identical duration. Hour labels display Europe/Budapest and timezone, preserving DST disambiguation. Daily labels represent UTC dates. An `asOf` anchor keeps list, history and drilldown aligned (accepted for one hour).

Growth = `(current - previous) / previous`. With zero previous count, growth is null and labelled `Új aktivitás` or `Nincs aktivitás`. `Most felkapott` requires at least 10 current associations and growth >=100%; other statuses use +/-10% thresholds. The existing segmented strength is explicitly a relative list index, not a probability.

## UI and loading

Mini charts use real SVG points, one observation is one dot, no invented history. Detailed inline charts use the existing Chart.js dependency, tooltips, source legend toggling, total/source modes and point selection. A keyboard-selectable point list also opens article drilldown. The inline period selector issues new requests for all supported intervals, including custom dates. Articles are paginated in groups of 50 and external URLs are restricted to HTTP(S).

Visible rows load progressively in groups of 12; history concurrency is three. Client/server caches are bounded to 64 entries and 30 seconds; server requests coalesce. Abort signals stop stale period work and queued histories. Invalid payloads and HTTP failures remain errors, never converted into fabricated zero data. Existing error/empty skeletons remain. A seven-child/six-column skeleton overflow discovered in browser validation was corrected.

## Database, limits and coverage caveats

Read-only consistent-snapshot transactions, UTC connections, four-connection pool, bounded queue, 5-second query hint, parameter binding, up to 20 filter values, 500 returned topics, 20,000 aggregate rows and bounded article offsets. Existing keyword/time and article indexes are reused; no schema change.

The first-observation CTE must inspect retained earlier associations, so production-sized EXPLAIN/latency is **not yet measured**. `truncated` marks a list capped at 500; global source/activity aggregates cover the filtered scope, whereas list totals cover returned topics. Keyword search is a client-side filter within that returned set.

Retention and pipeline keyword replacement may remove or move historical observations. `firstSeen` means first **retained** association, not proven first-ever occurrence on the web. Zero buckets mean no retained observations, not proof that ingestion was complete. Legacy aggregate-only snapshots cannot safely become article-level history. This limitation is included in the contract's coverage field.

## Validation checkpoint

- Targeted suite: 41 PASS, 0 FAIL, 1 MySQL environment SKIP (42 total).
- Tests cover UTC midnight/DST, all periods/leap/custom bounds, growth, duplicates, parameterization, category identity, source reconciliation, point drilldown, malformed/empty payloads, concurrency/abort, single-point rendering, tooltip/callback, panel period changes, source mode, articles, error retry and unmount.
- TypeScript: PASS.
- Targeted ESLint: 0 errors; 14 pre-existing warnings in preserved legacy API branches.
- Production build: 76/76 pages, PASS.
- MySQL integration: test added, **not executed against a database**. Local 127.0.0.1:3306 refuses connections; no integration opt-in URL is configured. The integration fixture is limited to explicitly opted-in loopback `_test` databases and rolls back inserts. No production DB connection attempted.
- Browser acceptance: actual local production build, API failure state. Populated-chart acceptance and database execution plans remain blocked by unavailable local MySQL. Unit/DOM tests do not replace that acceptance.
- Screenshots inspected at 1920×1080, 1440×900, 1024×900 and 390×844. Skeleton overflow fixed. On mobile, desktop overrides had clipped the KPI columns and made search overlap the hero; scoped responsive rules corrected both. Screenshots: `E:/Temp/utom-trend-intelligence-{1920,1440,1024,390}.jpg`. These show the explicit API error state, not populated-chart acceptance.

## Changed files

- `app/api/trends/route.ts`, `app/api/trend-history/route.ts`, `app/api/trends/trend-sources/route.ts`: opt-in v2 dispatch, legacy branches retained.
- `lib/trend-intelligence.ts`, `lib/trend-intelligence-service.ts`, `lib/trend-intelligence-http.ts`, `lib/trend-intelligence-client.ts`: canonical contracts, time/count semantics, read queries, bounded caching and loading.
- `components/SparklineMini.tsx`, `components/SparklineDetailed.tsx`, `components/TrendChartModal.tsx`: reusable real-data chart rendering.
- `components/TrendIntelligencePanel.tsx`, `components/TrendIntelligencePanel.module.css`: inline history/source/article analysis.
- `components/TrendsDashboard.tsx`, `components/TrendsDashboard.module.css`: integration, staged requests, error-state and mobile layout corrections.
- `tests/unit/trend-intelligence.test.cjs`, `tests/unit/trend-intelligence-ui.test.cjs`, `tests/unit/trend-intelligence-panel.test.cjs`, `tests/unit/trends-dashboard-presentation.test.cjs`, `tests/integration/mysql-trend-intelligence.test.cjs`: regressions and opted-in MySQL integration.
- `docs/trend-intelligence-v2.md`: semantics, audit, evidence and remaining acceptance gates.

Next acceptance: run `tests/integration/mysql-trend-intelligence.test.cjs` against a migrated disposable local `_test` database with the repository's existing explicit test opt-in; then validate actual populated chart hover, legend, period/source changes and point-to-article drilldown at the four viewport sizes. Do not deploy or call this fully accepted until those gates pass.
