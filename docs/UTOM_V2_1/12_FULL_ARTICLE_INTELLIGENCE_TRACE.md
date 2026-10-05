# V2.1 – derived article intelligence trace (2026-10-04)

> Ez a dokumentum a már tárolt V2 derived state és read model visszaolvasását bizonyítja. Nem helyettesíti a nyers cikkből induló canonical semantic E2E kaput; annak eredménye a `13_CANONICAL_INTELLIGENCE_E2E.md` dokumentumban van.

Ez a trace az izolált `utom_dev` demo fixture tényleges rekordjait és a publikus V2 read-model API-k válaszait mutatja. A szemantikai provider mindenhol deterministic mock; `PAID CALL: 0`. A fixture saját készítésű kontrollált szöveg, nem valódi újságcikk átvétele.

## 0. Input és kontrollált esemény

A kontrollált demo-cikkek közös eseményhez kötött, saját készítésű, egyenként 700–1200 szavas magyar fixture-szövegek. A jelenlegi validációs futás canonical article azonosítója `327`, címe: „Demo cikk 1 – hosszú magyar cím árvíztűrő tükörfúrógéppel”, forrása `telex.hu`, kategóriája `politika`, publikációja `2026-10-04T10:00:00Z`. A forrásvariánsok a fixture-ben `telex.hu`, `24.hu` és `index.hu`; a comparison scope az `eventId=20`, amely mindhárom article membershipét tartalmazza. Az ID-k auto-increment miatt resetenként változnak.

## 1–4. Ingestion, normalizálás, tartalom és summary

Az ingestion envelope canonical URL-t, SHA-256 URL identity-t, explicit feed publication source-t, request/run azonosítót és operation key-t tartalmaz. A normalizálás NFC/zero-width/CRLF szabályt, canonical source identity-t és explicit timezone timestampet használ. A demo summary rekord a jelenlegi futásban `summaryId=276`; a V2 context API ezt a fixture-hez tartozó összefoglalót adja vissza. A kontrollált fixture contentként kezelt, nem scrapingből származik.

## 5–10. Summary, category, sentiment, title és keyword

A legacy demo summaryban `plagiarism_score=0.12` vagy null, a kategória `politika`, a kulcsszó-réteg pedig `demo` és `téma-*` értékeket tartalmaz. A sentiment és clickbait mezők a seedelt legacy rekordokban maradnak; ezen a trace-en új AI-értékelés nem futott. A trend projection determinisztikus `trends`/`keywords` rekordokra épül.

## 11–12. Source dedup, cluster és related

Az RSS acceptanceben a Telex cikk canonical identity-je stabil maradt, a második feldolgozás nem hozott új article sort. A demo article `cluster_id=1`, related-news projection pedig az event/article kapcsolatokat használja; önhivatkozás és duplikált canonical identity nem keletkezett.

## 13. Entity extraction, normalizálás és resolution

| Entity | Típus | Normalizált név | Status | Confidence | DB ID |
|---|---|---|---|---:|---:|
| Demo szereplő | person | demo szereplő | accepted | 0.95 | 30 |
| Demo szervezet | organisation | demo szervezet | accepted | 0.90 | 31 |
| Demo hely | place | demo hely | review | 0.55 | 32 |
| Ismeretlen jelölt | person | ismeretlen jelölt | unresolved | 0.40 | 33 |

Az exact/alias lookup és a bizonytalan jelöltek státusza megmarad; automatikus AI-merge nem történt.

## 14. Relations

| Subject | Predicate | Object/value | Confidence | Status | Relation ID |
|---|---|---|---:|---|---:|
| Demo szereplő | works_for | Demo szervezet | 0.91 | active | 22 |
| Demo szereplő | located_in | Demo hely | 0.82 | active | 23 |
| Demo szervezet | has_value | `{value:42,unit:db}` | 0.60 | review | 24 |

Mindhárom relationhez egy-egy relation evidence rekord tartozik.

## 15. Claims és evidence

A fixture 12 claimet tárol: shared, source_only, két numeric, categorical, boolean, entity, temporal, attribution, uncertain, negated és unit típusokat. A numeric eltérés `120` és `150`, az unit claim `100 km`; minden claimhez külön `v2_claim_evidence` sor és fixture span tartozik. A canonical article (`327`) claimje: `claimId=85`, `type=shared`, evidence span „Bizonyító szövegrészlet 1”, source `telex.hu`, confidence `0.88`.

## 16. Claim group és események

| Group/event | Tartalom | Állapot |
|---|---|---|
| claim group 8 | population, numeric observations | conflict / show_all |
| event 20 | Demo esemény 1 | active |
| event 21 | Demo esemény 2 | active |
| event 22 | Demo esemény 3 | active |

Az event 20 három article-t tartalmaz a fixture-ben; az event 21 és 22 külön membership-ágat demonstrál.

## 17. Temporal graph és timeline

Az event 20 timeline-ja 25 public article itemet tartalmaz, ordering key `0001`–`0025`, confidence `0.70`–`0.90`. Az API `asOf=2026-10-04T11:29:02Z` mellett kizárja a jövőbeli rekordokat és a stabil orderinget adja. Korábbi as-of példa: `2026-10-04T09:00:00Z` esetén az ugyanezen valid idővel rendelkező későbbi publikációk nem kerülnek be.

## 18. Conflict detection és confidence history

| Conflict | Claim A/B | Típus | Severity | Winner |
|---|---|---|---|---|
| 13 | population 120 vs 150 | numeric | high | nincs |
| 14 | categorical source disagreement | categorical | medium | nincs |

A canonical policy mindkét megfigyelést megőrzi; a rendszer nem mondja meg, melyik az igaz. A confidence-history táblában a változás oka és időpontja auditálható; fizetős provider-hívás nem történt.

## 19. Source comparison

Az `/api/v2/source-comparison?eventId=20` válasza három source sort ad: `24.hu`, `index.hu` és `telex.hu`, mindegyik `articleCount=1`, stabil első/utolsó publikációs idővel. A részletes claim comparison a `detail=claims` ágon a shared/source-only/coverage megkülönböztetést adja; a source-only és hiányzó coverage nem kerül közös claimként összevonásra.

## 20. Premium intelligence

Aktív demo Premium sessionnel az `/api/v2/premium/intelligence?eventId=20` válasza `contractVersion=v2.premium-intelligence.1`, `status=ready`, context, source comparison, conflicts és history mezőket ad. Free és anonymous session esetén a route entitlement boundary-t tart: authenticated free `403 premium_required`, anonymous `401 not_authenticated`. A legacy proxy explicit `UTOM_API_KEY` nélkül `503 insights_unavailable`, ami ebben a tesztben szándékos és nem fake kulccsal megkerült állapot.

## 21. Tényleges API context válasz

Az `/api/v2/articles/327/context` most `partial=false` választ ad, benne:

- article és summary;
- `entities=[{id:30,type:person,name:Demo szereplő}]`;
- `claims=[claimId=85]`;
- `events=[eventId=20]`;
- a 25 elemű public timeline.

Ezt a read-model hibajavítás tette lehetővé: az `accepted` entity státusz és az `organisation`/`place` típus korábban kiesett a public projectionből, és az article context route a claims/timeline tömböt üresen hagyta.

## 22. DB before/after

| Tábla | Reset után | RSS első futás után | Változás |
|---|---:|---:|---:|
| articles | 40 | 41 | +1 |
| v2_ingestion_provenance | 2 | 3 | +1 |
| summaries | 34 | 34 | +0 |
| v2_entities | 4 | 4 | +0 |
| v2_claims | 12 | 12 | +0 |
| v2_events | 3 | 3 | +0 |
| v2_timeline_items | 25 | 25 | +0 |
| v2_conflicts | 2 | 2 | +0 |

## 23. Expected vs actual

| Terület | Expected | Actual | PASS? |
|---|---|---|---:|
| Entity | accepted/review/unresolved állapotok | 4 entity, explicit statusok | IGEN |
| Relation | 3 relation + evidence | 3 + 3 | IGEN |
| Claim | 12 típus | 12 | IGEN |
| Event | 1 közös + külön ágak | 3 event, 4 membership | IGEN |
| Conflict | 2, winner nélkül | 2, winner null | IGEN |
| Timeline | 25 determinisztikus item | 25 | IGEN |
| Source comparison | 3 source az event 20-ban | 3 | IGEN |
| Premium | ready aktív entitlementnél | ready | IGEN |
| RSS deep semantic | teljes mock extraction | RSS trace csak ingestionig; V2 mély fixture | RÉSZLEGES |

## Végső trace státusz

`DERIVED STATE TRACE: PASS`

`EXPECTED VS ACTUAL: PASS`

`ENTITY TRACE: PASS`

`CLAIM TRACE: PASS`

`EVENT TRACE: PASS`

`CONFLICT TRACE: PASS`

`SOURCE COMPARISON TRACE: PASS`

`TIMELINE TRACE: PASS`

`PREMIUM TRACE: PASS`

`RSS INGESTION DEEP SEMANTIC PROCESSING: FIXTURE-ONLY`

`CANONICAL SEMANTIC E2E: KÜLÖN KAPU – LÁSD 13_CANONICAL_INTELLIGENCE_E2E.md`

`PAID AI HÍVÁS: 0`

`PRODUCTION DB ÉRINTVE: NEM`

`PRODUCTION DEPLOY: NEM`

Egyszerűen: a rendszer a demo eseményhez 4 entityt, 12 claimet, 3 eventet, 25 timeline itemet és 2 konfliktust tart fenn; az eltérésekhez nem választ automatikus győztest, és az aktív Premium read model ugyanazt a determinisztikus állapotot adja vissza.
