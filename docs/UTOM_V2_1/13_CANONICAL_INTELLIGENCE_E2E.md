# V2.1 – canonical intelligence E2E kapu

## Cél és acceptance-rés

A korábbi `12_FULL_ARTICLE_INTELLIGENCE_TRACE.md` a már létező V2 derived rekordok és read modellek visszaolvasását bizonyította. A fixture közvetlenül tartalmazta az entity, relation, claim, event, conflict és timeline állapotot, ezért az a trace nem volt bizonyíték arra, hogy a nyers cikkből a canonical pipeline állítja elő ugyanezt az állapotot.

Ez a külön kapu a `V21-TRACE-F002` acceptance rést kezeli. A teszt manifestje a `tests/fixtures/v21-intelligence-e2e/expected.json`, a gépi acceptance harness pedig a `tests/integration/v21-canonical-intelligence-e2e.test.cjs`.

## Kontrollált nyers bemenet

Három, kizárólag tesztbemenetként használt magyar szöveg futott végig:

| Forrás | Canonical URL | Változat | Eltérés |
|---|---|---:|---|
| Telex | `https://telex.hu/v21-e2e/tiszapart-a` | A | 120 millió Ft |
| 24.hu | `https://24.hu/v21-e2e/tiszapart-b` | B | 150 millió Ft |
| Index | `https://index.hu/v21-e2e/tiszapart-c` | C | összeg hiányzik |

Mindhárom szöveg 700–1200 szavas (a jelenlegi fixture 746–754 szó), ugyanahhoz az eseményhez kapcsolódik, és tartalmaz numeric, temporal, attribution, negation és missing-coverage eltérést. Az `expected.json` csak acceptance oracle; nem kerül adatbázisba.

## Közvetlen seed ellenőrzés

Az E2E harness csak a három `sources` sort és a nyers `articles` bemenetet írja. A harness statikus őrszeme tiltja a `v2_entities`, `v2_entity_aliases`, `v2_entity_relations`, `v2_claims`, `v2_events`, `v2_conflicts`, `v2_timelines` és kapcsolódó derived táblák közvetlen INSERT-jét.

`DERIVED V2 TABLE DIRECT INSERT AZ E2E HARNESSBŐL: NEM`

## Canonical futás

| Modul | Input | Canonical output/persistence | Eredmény |
|---|---|---|---|
| M2 ingestion | 3 raw article + source URL | envelope, canonical URL, URL identity, source FK, article sor | PASS |
| M4 extraction | raw article text + deterministic mock provider | 21 `v2_entity_mentions`, evidence spanok | PASS |
| M5 normalization | extraction mentionek | normalized candidate név és típus | PASS |
| M6 resolution/onboarding | 21 mention + üres entity registry | 7 scope-olt provisional anchor, mind `unresolved`; ugyanaz a canonical context ugyanazt az ID-t használja | PASS |
| M7 relations | source-text relation output | a mock ebben a futásban üres relation-listát adott; nincs hamis relation insert | PASS / 0 relation |
| M8 claims | 3 cikk, numeric/temporal/text/boolean claimek | 11 claim és evidence rekord | PASS |
| M9 event matching | 3 candidate azonos normalized event key-jel | 1 event, 3 article membership | PASS |
| M10 temporal graph | event article membership | 1 timeline, 3 timeline item | PASS |
| M11 conflict | numeric eltérés két, azonos provisional subjectre kötött claim között | 1 numeric conflict, provenance megmarad, `automaticWinner=null` | PASS – unresolved anchor mellett |
| M12 cost router | minden semantic hívás deterministic mock | deterministic route, rögzített 0 költség | PASS |
| M13 read models | canonical output | event, claims, timeline és source comparison projection | PASS |
| M15 source comparison | ténylegesen feldolgozott 3 article | shared claim, 2 numeric observation, C missing coverage | PASS |
| M16 Premium | ugyanaz a read-model állapot | anonymous 401, free 403, active Premium 200, expired 403 | izolált runtime evidence |

## Entity anchor és conflict korlát

Az M6 most már a bizonyított mention-evidence alapján létrehoz egy scope-olt `v2_entities` sort `status='unresolved'` állapotban. Ez technikai anchor, nem accepted identity: fuzzy merge, namesake összevonás, type mismatch merge és automatikus winner továbbra sincs. A 059-es migráció a `(entity_type, language, normalized_name_hash, identity_scope_key)` kulccsal védi az idempotenciát és a párhuzamos worker-versenyt.

A claims ugyanazt a provisional subject ID-t használhatják. Az M11 nem lett lazább: null subject továbbra is hiba, stabil unresolved anchor esetén viszont a canonical numeric conflict létrejön, winner nélkül.

## DB before/after

Az E2E futás elején a fixture-scope derived táblái 0 releváns sort tartalmaztak.

| Tábla | Before | After | Ki írta |
|---|---:|---:|---|
| `v2_entity_mentions` | 0 | 21 | M4 `persistEntityExtraction` |
| `v2_entities` | 0 | 7 | M6 `onboardEntityMention` |
| `v2_claims` | 0 | 11 | M8 `persistClaimsWithEvidence` |
| `v2_claim_evidence` | 0 | 11 | M8 claim repository |
| `v2_events` | 0 | 1 | M9 `persistEventCandidate` |
| `v2_event_articles` | 0 | 3 | M9 event repository |
| `v2_timelines` | 0 | 1 | M10 `persistTimelineItem` |
| `v2_timeline_items` | 0 | 3 | M10 temporal repository |
| `v2_conflicts` | 0 | 1 | M11 conflict repository, unresolved subject anchorrel |

## Evidence integrity

Minden persisted claim evidence esetén a harness ellenőrzi:

- a span substringje megtalálható a nyers article textben;
- az article ID és source ID helyes;
- a `span_hash` a canonical `[articleId, sourceId, start, end, textSpan]` képletből újraszámolható.

`invalid spans: 0`
`source mismatch: 0`
`article mismatch: 0`
`hash mismatch: 0`

## Expected vs actual

Az acceptance manifest és a runtime összevetése alapján:

- entity extraction/normalization: 21 mention, 7 idempotensen újrahasznált provisional anchor, mind `unresolved`;
- relations: 0, mert a deterministic relation provider üres outputot adott és a rendszer nem ír fake relationt;
- claims: 11, a C változatból hiányzó numeric claim megmarad missing coverage-ként;
- events: 1 közös event, 3 membership;
- temporal: 1 timeline, 3 item;
- conflicts: 1 numeric conflict, winner nélkül; null subject továbbra is elutasított;
- source comparison: 3 source, 2 numeric observation, missing C coverage;
- Premium: az entitlement boundary korábbi izolált runtime smoke-ban megfelelt.

## MySQL és regresszió

Az explicit `UTOM_TEST_MYSQL_URL=mysql://demo:demo@127.0.0.1:3307/utom_v21_test` és `UTOM_MYSQL_TEST_OPT_IN=true` mellett a canonical E2E teszt PASS. A teljes, fájlonként izolált MySQL integration futás 56 tesztből 55 PASS és 1 SKIP; az egyetlen skip a lokálisan nem telepített FFmpeg miatt maradt. A production HTTP auth és a legacy PIN/proxy lifecycle explicit encryption key-jel PASS lett. Az FFmpeg skip külső eszközblokkoló, nem adatbázis- vagy canonical pipeline-hiba; nem jelöljük PASS-nak.

A claim persistence ISO `validFrom` hibáját (`ER_TRUNCATED_WRONG_VALUE`) a `mysqlUtc()` javította; ezt a `V21-TRACE-F003` finding dokumentálja. A nem alapértelmezett MySQL-portot figyelmen kívül hagyó pipeline connection konfigurációkat a `V21-BUG-F002` részeként egységesítettük.

`V21-BUG-F001`: PASS
`V21-BUG-F002`: PASS
`V21-BUG-F003`: PASS
`V21-BUG-F004`: PASS
`V21-RSS-F001`: PASS
`V21-RSS-F002`: PASS
`V21-TRACE-F001`: PASS
`V21-TRACE-F003`: PASS

## Státusz

`DERIVED STATE TRACE: PASS`

`CANONICAL SEMANTIC E2E: PASS`

`RAW ARTICLE → PROVISIONAL ENTITY ANCHOR: PASS`

`RAW ARTICLE → CLAIM: PASS`

`RAW ARTICLES → EVENT MATCHING: PASS`

`CLAIMS → CONFLICT: PASS – WINNER NÉLKÜL`

`TEMPORAL GRAPH: PASS`

`SOURCE COMPARISON: PASS`

`PREMIUM: PASS – ISOLATED ENTITLEMENT EVIDENCE`

`EVIDENCE INTEGRITY: PASS`

`PAID AI CALL: 0`

`PAYMENT CALL: 0`

`PRODUCTION DB ÉRINTVE: NEM`

`PRODUCTION DEPLOY: NEM`


## V2.1 final closure cross-reference – 2026-10-04

SEO/sharing, Premium UX, ingestion technical audit, localhost load/soak and final quality evidence are consolidated in docs/UTOM_V2_1/10_V2_1_FINAL_ACCEPTANCE.md and docs/UTOM_V2_1/17_V2_1_RELEASE_READINESS.md. No production DB, deploy, payment or paid AI was used.

