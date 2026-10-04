# M18 – Végső integráció

## Pontos kanonikus név

`M18 – Final integration`

## Cél

Az M1–M17 által elkészített V2 rétegek összehangolt, jóváhagyott paneles rolloutja. A rollout feature flaggel, visszafordíthatóan és a legacy felületek megőrzésével történik.

## Bemenet és kimenet

A bemenet a canonical V2 flag, a már ellenőrzött M13–M17 backend/read modellek, valamint az M14 frontend context/timeline panel. A kimenet egy owner által jóváhagyott panelkészlet, amely a stabil V2 envelope-okat, entitlement-határt, recovery viselkedést és legacy kompatibilitást használja.

## M17 → M18 határ

M17 a bounded, folytatható háttérfeldolgozást és recovery bizonyítékot adja. M18 ezt integrációs szinten ellenőrzi a read API-kkal, a flagelt frontenddel, a premium jogosultsággal és a meglévő pipeline/recovery regressziókkal. Új feldolgozó motor, új AI-provider útvonal és destructive migration nem része.

## Nem cél

Payment, billing, automatikus conflict-winner, új graph adatbázis, közvetlen provider-hívás, legacy route-ok kikapcsolása vagy owner/product döntés Codex általi meghozása.

## Tulajdonosi döntések

Az M18-at blokkoló három döntés rögzítve lett:

- a cikkpanelen a sorrend: `Kontextus és idővonal` → `Források összehasonlítása` → `Prémium elemzés`;
- a source comparison kizárólag az adott cikkhez kapcsolt eseményekre épül, egy esemény automatikus, több esemény esetén kötelező választással, nulla eseménynél nincs kérés;
- a premium panel kizárólag a szerveroldali `/api/v2/premium/intelligence` jogosultságát fogadja el; 401/403 zárt állapotot mutat, nincs payment vagy AI CTA.

A rollout sorrendje: backend OFF → frontend OFF → staging szerver ON → frontend ON → Chrome smoke → nyilvános bekapcsolás.

## Acceptance-gap mátrix

| ID | Követelmény | Állapot | Meglévő bizonyíték | Függőség | Hátralévő munka |
|---|---|---|---|---|---|
| M18-01 | Article context/timeline flagelt integráció | COMPLETE | M14 Chrome acceptance, OFF/ON mátrix, race és malformed response tesztek | M13, M14 | nincs |
| M18-02 | M13/M15 read API kompatibilitás | COMPLETE | M13 és M15 offline/MySQL contract és HTTP regressziók | M13, M15 | nincs |
| M18-03 | Premium entitlement és redaction | COMPLETE | M16 server-side entitlement és response contract | M16 | nincs |
| M18-04 | Bounded backfill és recovery | COMPLETE | M17 MySQL 8.0.46 cursor, pause/resume, rollback, checksum | M17 | nincs |
| M18-05 | Kétkapcsolatos concurrency | COMPLETE | M17 valódi MySQL két worker, deadlock retry és idempotencia | M17 | nincs |
| M18-06 | Legacy kompatibilitás | COMPLETE | M14 OFF/OFF és OFF/ON legacy render, M13–M17 feature-off regressziók | M14–M17 | nincs |
| M18-07 | Teljes offline/typecheck/lint/import/build kapu | COMPLETE | offline 365/365, TypeScript, ESLint 0 error, import, npm check, build PASS | M14–M17 | nincs |
| M18-08 | Jóváhagyott panelkészlet és rollout-sorrend | COMPLETE | Tulajdonosi döntések rögzítve: panel-sorrend, event-scope, entitlement és rollout sorrend | owner döntés | nincs |
| M18-09 | Source comparison frontend panel | COMPLETE | Valós Chrome fixture: egy esemény ready, nulla eseménynél nincs kérés/panel, több eseménynél nincs automatikus első választás, a selector választás után a megfelelő event-kérést indítja | M15, owner döntés | nincs |
| M18-10 | Dedicated premium intelligence frontend panel | COMPLETE | Valós Chrome canonical session fixture: non-premium 403 zárt állapot, active Premium 200 és determinisztikus M16 tartalom, expired 403 zárt állapot; közös sessionben a jogosultságváltás után nem maradt stale Premium DOM | M16, owner döntés | nincs |

**Összesítés:** COMPLETE 8, PARTIAL 0, NOT STARTED 0, BLOCKED 0, N/A 0.

## Biztonsági és termékhatárok

- A backend entitlement marad a premium igazságforrása; kliensflag nem ad hozzáférést.
- Feature OFF állapotban nincs V2 DB/provider mellékhatás.
- M12 költségrouter megkerülése tilos; a jelenlegi M18 slice nem hív AI-providert.
- A hiányzó source comparison és premium panelekhez nem készül félrevezető, működőnek látszó UI owner döntés nélkül.

## Validáció

- M17 MySQL 8.0.46 integráció: PASS.
- M17 regression: 7/7 PASS.
- Offline suite: 365/365 PASS.
- TypeScript: PASS.
- ESLint: 0 error; repository összesen 383 warning.
- Import check: PASS.
- `npm run check`: PASS.
- Production build: PASS.
- Fizetős provider hívás: 0.

## M18 implementációs bizonyíték

- Integrációs komponens: `components/V2ArticleIntegrationPanels.tsx`;
- source comparison: `components/V2SourceComparisonPanel.tsx`, `hooks/useV2SourceComparison.ts`, `lib/v2/source-comparison-client.js`;
- premium intelligence: `components/V2PremiumIntelligencePanel.tsx`, `hooks/useV2PremiumIntelligence.ts`, `lib/v2/premium-intelligence-client.js`;
- article context eseménylista: `app/api/v2/articles/[id]/context/route.ts`, `lib/v2/article-context-client.js`;
- célzott regresszió: `tests/unit/m18-integration-gate.test.cjs`, 6/6 PASS;
- fontos integrációs javítás: a parent komponens egyetlen context fetch-t birtokol, a prezentációs context panel nem indít második párhuzamos kérést.

## M18 findingok

- `M18-F01` – A V2 read route-ok same-origin frontend fetch esetén API-kulcs nélkül is 401-et adtak. Gyökérok: a böngésző nem kaphat szerveroldali kulcsot. Javítás: csak a három explicit V2 read route (`GET /api/v2/articles/:id/context`, `GET /api/v2/source-comparison`, `GET /api/v2/premium/intelligence`) opt-in kivétele kap érvényt; ehhez egyszerre szükséges a `GET` metódus és a `sec-fetch-site: same-origin`. Az `Origin` hiányozhat a Chrome same-origin GET-ből; ha jelen van, egyeznie kell a kérés originjével vagy az engedélyezett origin-listával. A jelen lévő `Referer` ugyanilyen egyezési ellenőrzést kap. Cross-origin, mutation és más GET route kulcs nélkül továbbra is 401. A Premium entitlement ettől nem változik: anonymous 401, non-premium/expired 403, active premium 200. Célzott regresszió: M18 contract teszt az opt-in route-listára, metódusra, fetch metadata-ra, Origin/Referer eltérésre és hiányzó Originre; production fixture Chrome context/source/premium fetch.
- `M18-F02` – Több event esetén a source panel idle állapotban korai `null` visszatéréssel elrejtette a választót. Javítás: idle állapotban a panel és a választó megjelenik, de kérés nem indul. Célzott regresszió: M18 contract teszt és Article C Chrome fixture.

## Böngészős ellenőrzés állapota

Chrome production runtime-ban valódi MySQL fixture-rel ellenőrizve lett az Article A egy-event ready állapota, a source comparison semleges shared/source-only megjelenítése, az anonymous Premium 401 zárt állapota, az Article B nulla-event állapota, valamint az Article C több-event selector és választás előtti kérésmentessége. A single context kérés közös parent hookból indul; a korábbi dupla fetch megszűnt. A canonical session fixture-rel ugyanabban a valódi Chrome sessionben egymás után ellenőrzött non-premium 403, active Premium 200 és expired 403 állapot; active után expired váltáskor Premium tartalom nem maradt a DOM-ban. Az active állapotban a determinisztikus M16 szöveg megjelent, belső adat nem szivárgott, provider- és payment-hívás nem történt, konzolhiba nem maradt.

`M18 IMPLEMENTÁCIÓ: COMPLETE – a MySQL, public/anonymous és authenticated Premium Chrome gate zöld.`

`M18 BLOKKOLÓ TULAJDONOSI KÉRDÉSEK: 0`

`M18 COMPLETE: IGEN`

Az M18-F01 szűk security regresszió lefedése: a célzott teszt ellenőrzi a `GET`-korlátozást, az explicit same-origin opt-int, a fetch metadata-t, a jelen lévő `Origin`/`Referer` egyezését, a hiányzó Origin elfogadását, valamint a cross-origin, opt-in nélküli GET és mutation kérések elutasítását. A valódi Chrome fixture-ben a V2 same-origin `GET` ténylegesen `sec-fetch-site: same-origin` fejlécet küldött `Origin` nélkül; ezt a korrigált modell elfogadja, miközben az Origin és Referer mismatch továbbra is tiltott. A canonical session fixture közvetlenül a meglévő session token/hash/expiry modellt használta, ezért a LoginModal reCAPTCHA-ja nem volt része ennek a gate-nek.

## M18 ideiglenes MySQL fixture

- WSL: Ubuntu 24.04.5 LTS;
- MySQL: 8.0.46;
- migráció: 001→058, `pending=0`;
- fixture: négy cikk, egy nulla-event, egy több-event, két forrás, shared/source-only/numeric claim és három entitlement állapot;
- böngészős runtime: production build, szerver- és frontendflag ON;
- ellenőrzött API: anonymous Premium 401, active Premium fixture 200, source comparison event-scope 200;
- teardown: ideiglenes adatbázis, felhasználó és credential eltávolítva, repositoryban nem maradt fixture vagy titok.
