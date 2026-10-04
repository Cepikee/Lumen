# Bug hunt és fault injection

## Tesztmátrix

API 500/404, hibás JSON, null, timeout, lassú hálózat, offline, képbetöltési hiba, DB unavailable/slow, worker crash, session expiry, hibás cookie, Premium downgrade, nagy cikk és nagy source comparison.

## Finding formátum

`V21-BUG-Fxxx`: reprodukció, root cause, severity, javítás, regresszió, státusz.

### V21-BUG-F005 – kapcsolódó hírek canonical source allowlist hibája

- **Severity:** Medium
- **Reprodukció:** valódi Chrome article detail oldalon a `/cikk/1` kérés `/api/related?source=telex&exclude=1&limit=5` választ adott.
- **Root cause:** a `normalizeRelatedSource()` canonical kulcsot (`telex.hu`, `index.hu`, stb.) adott vissza, miközben a route allowlistje csak rövid aliasokat tartalmazott (`telex`, `index`, ...), ezért a valid kérés 400-zal leállt.
- **Javítás:** az allowlist canonical source kulcsokra váltott; az aliasok továbbra is a közös normalizálón keresztül működnek.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs`, related route unit regressziók és Chrome runtime ellenőrzés; a kérés most 200-as tömbválaszt ad.
- **Státusz:** `FIXED`

### V21-BUG-F006 – kategória Insights jogosultsági hiba félrevezető UI-ja

- **Severity:** Medium
- **Reprodukció:** anonim Chrome sessionben a `/insights/category/politika` premium proxy 401 válasza a képernyőn általános „Szerverhiba vagy hálózati probléma” üzenetként jelent meg.
- **Root cause:** a page minden nem-2xx választ ugyanazzal az exceptionnel kezelte, nem különítette el a 401/403 entitlement állapotot, és hiba után a korábbi adatot sem törölte.
- **Javítás:** explicit 401/403/egyéb HTTP üzenetek, adatállapot törlés hiba esetén, `AbortController` alapú cancellation és unmount/race védelem.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs`; anonim és prémium Chrome ellenőrzés.
- **Státusz:** `FIXED`

### V21-BUG-F007 – Next dynamic params szinkron olvasása category API-ban

- **Severity:** Low
- **Reprodukció:** Next.js 16 dev runtime a category API minden kérésénél `params is a Promise` figyelmeztetést írt, és csak URL-fallbackből kapta meg a kategóriát.
- **Root cause:** a route közvetlenül `context.params.category` mezőt olvasott Promise-alapú route contextből.
- **Javítás:** a route a Promise-alapú és a régi objektum-alapú contextet is feloldja, majd a feloldott paraméterből normalizál.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs`; category API Chrome runtime ellenőrzés figyelmeztetés nélkül.
- **Státusz:** `FIXED`

## Acceptance

Csak bizonyított hiba kap javítást; minden javítható finding FIXED vagy konkrét külső ok miatt BLOCKED.

## Státusz

`CLOSED – browser findings F008–F011 FIXED`.

## Browser closure findings – 2026-10-04

### V21-BUG-F008 – mobil fejléc túlcsordulás

- **Severity:** Medium
- **Reprodukció:** valódi Chrome CDP-ben 360×800 viewporton a fejléc menüje és a fix kereső egy flex sorba kényszerült; a dokumentum scrollWidth=438 lett.
- **Root cause:** a fejléc mobil tördelés nélkül tartotta meg a másodlagos navigációt és a kereső fix szélességét.
- **Javítás:** mobilon a kereső külön teljes szélességű sorba kerül, a másodlagos navigáció a menüpanelen marad, a fejléc elemei zsugoríthatók.
- **Regresszió:** exact Chrome viewport matrix 360/390/430/768/1366/1920; 36 route×viewport ellenőrzés, horizontal overflow 0.
- **Státusz:** FIXED

### V21-BUG-F009 – loopback host alias miatt elutasított böngészős V2 read

- **Severity:** Medium
- **Reprodukció:** Chrome a böngészőoldalt 127.0.0.1:3011, a Next request URL-jét localhost:3011 néven adta át; a V2 context és source comparison route 401-et adott ugyan-origin böngészőből.
- **Root cause:** az isAllowedSameOriginRead csak szöveges origin-egyezést fogadott el, és egyes transportoknál a Sec-Fetch-Site hiányát sem kezelte.
- **Javítás:** a security wrapper a localhost, 127.0.0.1 és ::1 aliasokat azonos protokoll és port mellett ugyan-originként kezeli; hiányzó fetch metadata esetén csak Origin/Referer bizonyított egyezésével enged.
- **Regresszió:** m18 integration gate; valódi Chrome context 200, source comparison 200, aktív Premium article flow 0 hálózati hiba.
- **Státusz:** FIXED

### V21-BUG-F010 – billentyűzetes fókuszjelzés felülírása

- **Severity:** Medium
- **Reprodukció:** Chrome 360×800 oldalon Tab navigációval a fókuszált linkek és gombok computed style-ja outline: none volt.
- **Root cause:** a globális fókusz-reset későbbi példánya és a kereső selector a focus-visible jelzést is felülírta.
- **Javítás:** a reset csak nem-focus-visible állapotban töröl outline-t; minden billentyűzettel elérhető vezérlő kap 3px-es kontrasztos fókuszgyűrűt.
- **Regresszió:** browser-a11y-contract; valódi Chrome Tab acceptanceben a vizsgált vezérlők rgb(13,110,253) solid 3px fókuszt kaptak.
- **Státusz:** FIXED

### V21-BUG-F011 – hiányzó dokumentum- és vezérlősemantika az article/auth UI-ban

- **Severity:** Medium
- **Reprodukció:** article detail oldalon nem volt h1; a login modal nem jelölt dialogként; a profil avatar nem volt billentyűzettel elérhető vezérlő.
- **Root cause:** vizuálisan működő elemek szemantikai és keyboard contract nélkül kerültek a DOM-ba.
- **Javítás:** article cím h1, LoginModal dialog semantics, ProfileMenu keyboard trigger.
- **Regresszió:** browser-a11y-contract és Chrome DOM acceptance.
- **Státusz:** FIXED

## 2026-10-04 browser closure evidence

- Windows Chrome 154 CDP, disposable profile, isolated local runtime; normal user profile, production DB, payment és paid AI nem érintett.
- Exact viewport matrix: 360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080; homepage, Trends, Insights, category Insights, Premium, article detail; 36/36 overflow PASS.
- Canonical article 1: context 200, partial=false, entity/claim/event/timeline projection jelen; source comparison 200, 3 source jelen.
- Event coverage: 0-event article, 1-event article és több eseményes article két választható eseménnyel; render crash és overflow nélkül.
- Anonymous/free/active/expired session matrix: anonymous és free zárolt; active Premium Insights és article intelligence működik; expired állapotban nincs stale Premium stat.
- Accessibility: heading, named controls, image alt, dialog/profile semantics és keyboard focus-visible ring Chrome-ban ellenőrizve; targeted contract tests PASS.
- Az anonim Premium 403 entitlement válasza zárolt felhasználói állapotként jelenik meg; active Premium futásban network failure, console error és runtime error 0.

### V21-BUG-F001 – localhost auth külső CAPTCHA/analytics függősége

- Képernyő/flow: gyökér layout és LoginModal, localhost auth/reset.
- Reprodukció: site key és Google szolgáltatás nélkül a layout külső scriptet töltött, a login/reset közvetlenül a hiányzó `grecaptcha.execute` hívást használta.
- Root cause: nem volt explicit local adapter és nem volt környezeti kapcsoló a külső script-ekhez.
- Javítás: `getRecaptchaToken`, loopback-only `UTOM_LOCAL_DEMO_CAPTCHA`, feltételes analytics/reCAPTCHA script, production fail-closed.
- Regression: `tests/unit/v21-localhost-adapters.test.cjs`, célzott tesztek PASS.
- Státusz: `FIXED`.
## Lezárt localhost findingok – 2026-10-04

### V21-BUG-F002 – konfigurált MySQL port elveszett runtime route-okban

- Reprodukció: demo MySQL 3307-en, `/api/summaries` és `/api/trends` kérése production-szerű Next runtime-ból.
- Root cause: több `createConnection`/`createPool` objektumból hiányzott a `port`, ezért a driver 3306-ra csatlakozott.
- Javítás: explicit `Number(process.env.DB_PORT || 3306)` minden érintett runtime configban.
- Regresszió: `v21-localhost-adapters.test.cjs`; demo smoke `/api/summaries` és `/api/trends` 200.

### V21-BUG-F003 – Híradó üres videóeredmény renderhibája

- Reprodukció: demo adatbázisban nincs aznapi `videos` rekord, `/hirado` megnyitása.
- Root cause: a query eredményének közvetlen destructuringje eltérő/üres driver-eredménynél iterálhatatlan értéket kezelt.
- Javítás: explicit query result és tömb-normalizálás; üres eredmény `videoId=0` állapotként renderelhető.
- Regresszió: production build és `/hirado` smoke 200 izolált demo runtime-ban.

### V21-BUG-F004 – Secure session cookie blokkolta a HTTP localhost Premium flow-t

- Reprodukció: production-mode Next runtime HTTP localhoston; demo Premium login 200 után `/api/auth/me` anonim állapotot adott.
- Root cause: a cookie feltétel nélkül `Secure` volt minden `NODE_ENV=production` runtime-ban, miközben a helyi acceptance HTTPS nélkül fut.
- Javítás: a Secure flag explicit, loopback + `utom_dev` + local-demo guard mögött kikapcsolható; minden más production konfigurációban Secure marad.
- Regresszió: `v21-localhost-adapters.test.cjs`; demo Premium login → `/api/auth/me` `loggedIn=true`.

### V21-TRACE-F001 – V2 article context elvesztette a tárolt intelligence adatot

- Reprodukció: article context lekérés olyan fixture article-re, amelyhez claim, entity és event timeline tartozik; a korábbi válasz `entities=[]`, `claims=[]`, `timeline=[]`, `partial=true` volt.
- Root cause: a route csak az article és event alapadatot kérte le, a három intelligence projection tömböt üresen hagyta; az `accepted`/`organisation` entity státuszok public repositoryból is kiestek.
- Javítás: claims és public entity-k lekérése article/event scope alapján, timeline projection bekötése, `accepted` státusz és `organisation`/`place` típus engedélyezése.
- Regresszió: `v21-v2-trace-contract.test.cjs`; demo `/api/v2/articles/<id>/context` most `partial=false`, claim/entity/timeline adatokkal tér vissza.

### V21-TRACE-F002 – a korábbi trace nem bizonyította a nyers cikkből induló semantic E2E-t

- Típus: acceptance gap, nem önmagában alkalmazási hiba.
- Reprodukció: a korábbi `12_FULL_ARTICLE_INTELLIGENCE_TRACE.md` közvetlenül seedelt V2 entity/relation/claim/event/timeline állapotot olvasott vissza.
- Hiány: az extraction → normalization → resolution → claim → event → conflict canonical futás nem volt gépi úton bizonyítva.
- Kezelés: új, külön raw-input canonical kapu készült; a derived readback trace státusza ettől külön marad.
- Státusz: `FIXED` acceptance evidence gapként, a teljes semantic gate eredménye a `13_CANONICAL_INTELLIGENCE_E2E.md` dokumentumban.

### V21-TRACE-F003 – ISO időbélyeg közvetlenül MySQL DATETIME mezőbe került

- Reprodukció: a canonical háromforrásos claim-futás `validFrom="2026-10-18T00:00:00Z"` értéknél MySQL 8 `ER_TRUNCATED_WRONG_VALUE` hibával állt le.
- Root cause: a claim persistence réteg az ISO értéket átalakítás nélkül adta a `DATETIME(6)` bind paraméternek.
- Javítás: közös `mysqlUtc()` normalizálás `YYYY-MM-DD HH:mm:ss.sss` formára, a `valid_from` és `valid_until` mezők előtt.
- Regresszió: `tests/integration/v21-canonical-intelligence-e2e.test.cjs`, canonical MySQL futás PASS.
- Státusz: `FIXED`.

### V21-ENTITY-F001 – Az új entitykhez nem jött létre stabil unresolved internal anchor

- Severity: `High`.
- Reprodukció: tiszta V2 sémában három raw article M4 mentionjei után az M6 csak candidate lookupot végzett; új névnél nem volt `v2_entities` sor és a claim `subject_entity_id` értéke null maradt. Az M11 emiatt helyesen `subject_entity_id_required` hibát adott.
- Root cause: hiányzott az entity lifecycle író oldala; a mention resolution és a master entity létrehozása nem volt egy tranzakciós, evidence-bound művelet.
- Javítás: 059-es additív scope-kulcs, `onboardEntityMention`, bizonyíték-span ellenőrzés, unresolved anchor státusz, unique/idempotens insert, mention binding és confidence/history audit. Az accepted identity lookup, fuzzy policy, namesake- és type-mismatch védelem változatlan.
- Regression: `mysql-v2-entity-resolution-m6.test.cjs` (evidence-bound, evidence-less/invalid span reject, retry, namesake scope, type mismatch, concurrency); `v21-canonical-intelligence-e2e.test.cjs` (3 raw article, 21 mention, 7 provisional anchor, 11 subject-bound claim, 1 conflict winner nélkül).
- Státusz: `FIXED`.

### V21-PERF-F001 – production auth probe duplikáció

- Severity: Medium.
- Reprodukció: disposable Windows Chrome CDP profillal production-like runtime-ban a homepage, article és Premium navigációk három `/api/auth/me` kérést indítottak útvonalanként.
- Root cause: a `ClientLayout` és a `Header` ugyanazt a store loadert indította, a Header pedig külön kézi auth fetch-et is futtatott.
- Javítás: a Header maradt az egyetlen store-loader; a ClientLayout loader effectje és a Header kézi auth probe-ja megszűnt.
- Regresszió: `tests/unit/browser-product-contract.test.cjs`, 5/5 PASS; fix utáni Chrome CDP-mérésben minden vizsgált viewporton 0 duplikált auth-kérés.
- Státusz: `FIXED`.
