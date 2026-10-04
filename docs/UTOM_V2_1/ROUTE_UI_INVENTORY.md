# Repository és route/UI inventory

## Mért állapot

- `app/` alatt 94 `page.tsx`, `route.ts` vagy `layout.tsx` fájl található.
- Nyilvános fő felületek: `/`, `/cikk/[id]`, `/insights`, `/insights/category/[category]`, `/trends`, `/hirado`, `/premium`, `/premium-faq`, `/kapcsolat`, jogi és landing oldalak.
- Auth és fiók UI: `components/LoginModal.tsx`, `RegisterModal.tsx`, `ProfileView.tsx`, `ProfileMenu.tsx`, `SettingsView.tsx`, `PasswordChangeModal.tsx`, `PinChangeModal.tsx`, `UsernameChangeModal.tsx`, valamint reset/verify oldalak.
- V2 UI panelek: `V2ArticleContextPanel.tsx`, `V2SourceComparisonPanel.tsx`, `V2PremiumIntelligencePanel.tsx`, `V2ArticleIntegrationPanels.tsx`.
- Közös shell: `components/ClientLayout.tsx`, `Header.tsx`, `Sidebar.tsx`, `app/layout.tsx`.
- API családok: auth/user, summaries/feed/related/sources, trends, insights, Híradó, premium, V2, belső health/maintenance és ingestion.

## Route mátrix

| Felület | Route | Auth | Premium | V2 | Desktop | Mobil | Állapot |
|---|---|---:|---:|---:|---:|---:|---|
| Fő feed | `/` | nem | nem | részben | inventory | inventory | audit előtt |
| Cikk | `/cikk/[id]` | nem | részben | igen | inventory | inventory | audit előtt |
| Keresés/feed | `/api/summaries`, `/api/fetch-feed` | nem | nem | nem | API inventory | API inventory | audit előtt |
| Kategória Insights | `/insights/category/[category]` | nem | nem | nem | inventory | inventory | audit előtt |
| Insights | `/insights` | nem | részben | részben | inventory | inventory | audit előtt |
| Trends | `/trends` | nem | nem | nem | inventory | inventory | audit előtt |
| Híradó | `/hirado` | részben | igen | nem | inventory | inventory | audit előtt |
| Premium | `/premium` | igen | igen | igen | inventory | inventory | audit előtt |
| Auth/reset | `/api/auth/*`, `/reset-password`, `/reset-pin`, `/verify-email` | igen/részben | nem | nem | API inventory | API inventory | audit előtt |
| V2 context | `/api/v2/articles/[id]/context` | nem | részben | igen | API inventory | API inventory | audit előtt |
| V2 timeline | `/api/v2/timelines/[ownerType]/[ownerId]` | nem | részben | igen | API inventory | API inventory | audit előtt |
| V2 source comparison | `/api/v2/source-comparison` | nem | részben | igen | API inventory | API inventory | audit előtt |
| V2 premium intelligence | `/api/v2/premium/intelligence` | igen | igen | igen | API inventory | API inventory | audit előtt |
| Belső health | `/api/internal/health` | belső | nem | nem | API inventory | N/A | audit előtt |

## Közvetlen függőségek

| Terület | Közvetlen komponensek/hooks | API függőség |
|---|---|---|
| Shell/auth | ClientLayout, Header, ClientWrapper, useUser | `/api/auth/me`, login/logout, user |
| Feed | FeedList, FeedItemCard, InputBar | summaries, fetch-feed, related |
| Insights | InsightFilters, InsightList, charts, useInsights | insights/* |
| V2 cikk | V2ArticleContextPanel, integration panels, useV2ArticleContext | v2/articles, timelines, entities, events |
| V2 Premium | V2PremiumIntelligencePanel, useV2PremiumIntelligence | v2/premium/intelligence |
| Helyi demo | `scripts/dev-demo-bootstrap.cjs` | MySQL 8, migrations 001–059 |

## Coverage státusz

Ez az inventory a V2.1 audit kiindulópontja. A valódi Chrome acceptance és a hibajavítási findingok külön fázisban következnek; jelenleg nincs vizuális PASS állítás.
