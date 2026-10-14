# UTOM V2.2 – HuSpaCy-assisted semantic binding research

## Végső eredmény

`HUSPACY ASSISTED BINDING RESEARCH: COMPLETE`

`DEPENDENCY-ASSISTED BINDING BENEFIT: NOT PROVEN`

`PRODUCTION DEPENDENCY HIGH: RESOLVED`

`RECOMMENDED ARCHITECTURE: C – MORE RESEARCH`

`NEXT_REAL_WORLD_BLIND_TEST_READY: NO`

A HuSpaCy nyelvi réteg hasznos entitás- és morfológiai jelölteket adott, és a #003 diagnosztikában helyesen kötötte a két vezető választási százalékot. Az új, előre befagyasztott held-out készleten azonban a dependency-assisted D konfiguráció kevesebb helyes subject/numeric frame-et adott, mint a B/C konfiguráció. Az előírt döntési feltétel ezért nem teljesült. Production integráció nem készült.

## 1. Baseline freeze

- Branch: `develop/utom-recovery`
- Local és remote HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Kiinduló working-tree státusz SHA-256: `4DCDB0B9E7CD8CD2957454B7038C0424E121EF8AABBC9383832C19F6F44FA41C`
- Intelligence hash-ek változatlanok:
  - `deterministic-semantic.js`: `456004DBE83ABBAD63523C08B8047BA849089C91142E40F38264B75764126C72`
  - `entity-extraction-provider.js`: `88CAB2995E4EA5F3B01DB7CEAB59ED835C7ED24328E06D682750001EDD2AA14B`
  - `deterministic-text-provider.cjs`: `DEDE26749235C61D62E6C89E8F7F9F3214672139E5839DDED120CDFE89793D4E`
- A korábbi local-NLP bake-off artefaktumok hash-eit a `00_state_freeze.json` rögzíti.
- Commit, push, deploy és production-hozzáférés nem történt.

## 2. Production dependency HIGH

| Tétel | Eredmény |
|---|---|
| Package | `source-map-js` |
| Érintett verzió | `1.2.1` |
| Advisory | `GHSA-68fv-2mgg-jv7q` |
| CWE / CVSS | CWE-1284 / 7.5 HIGH |
| Hiba | Speciálisan kialakított indexed source-map section offset eseményhurok-terhelést okozhat |
| Függőség | Tranzitív |
| Utak | `postcss`; `@tailwindcss/postcss → @tailwindcss/node`; `jsdom → @asamuzakjp/dom-selector → css-tree` |
| Runtime/build | PostCSS/Tailwind ág build-time; a `jsdom` production dependency, de az alkalmazás publikus útvonalán nem találtunk user-supplied source-map feldolgozást |
| Bundle elérés | A sérülékeny parser nem igazoltan érhető el felhasználói inputtal; ettől a production audit HIGH maradt |
| Compatible fix | `source-map-js@1.2.2` |
| Breaking update | Nem szükséges |

A `package.json` kompatibilis override-ja minden ágat `1.2.2`-re kényszeríti. `npm ls source-map-js --all` egyetlen, deduplikált `1.2.2` verziót mutat. `npm audit --omit=dev`: **0 vulnerability**.

`PRODUCTION_DEPENDENCY_HIGH_RISK: RESOLVED`

A teljes fejlesztői auditban továbbra is 5 HIGH marad a `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` lint/tooling láncban. A felajánlott automatikus javítás breaking downgrade lenne, ezért nem alkalmaztuk.

## 3. Architektúra és safety policy

HuSpaCy csak a következő candidate adatokat adhatja:

- sentence/token és pontos raw offset;
- lemma, POS, morphology;
- dependency head és relation;
- NER span és type.

Kanonikus claim, event, relation, conflict vagy fact közvetlenül nem keletkezhet. A kutatási kimenetek `candidateOnly: true`, `canonicalWrites: 0` mezőkkel készültek.

Routing policy:

1. Ha a HuSpaCy entity/dependency és a determinisztikus evidence/metadata határ ugyanazt támasztja alá, a candidate továbbadható egy későbbi safety gate-nek.
2. Ha a dependency parse hiányos vagy az entity nem köthető bizonyíthatóan ugyanahhoz a conjunct/clause-hoz, D abstainel.
3. HuSpaCy és determinisztikus szabály ütközésekor HuSpaCy nem nyer automatikusan.
4. Worker timeout, crash, malformed válasz vagy túlméretes kérés esetén deterministic-only fallback következik.

## 4. Persistent worker

- A modell egyszer töltődik.
- JSONL/stdin persistent worker több kérést szolgál ki.
- Maximum input: 200 000 karakter.
- Kérés timeout a harnessben: 5 másodperc.
- Malformed JSON: elutasítva.
- Oversized request: elutasítva.
- Kényszerített crash: észlelve.
- Restart utáni kérés: sikeres.
- Fallback: `deterministic-only`, `abstainFromNlp: true`.
- Kanonikus írás: 0.

## 5. Új frozen held-out

Tíz téma: gazdaság, választás, sport, időjárás, energia, egészségügy, bíróság, vállalati hír, tudomány és közlekedés. Tartalmaz két- és háromalanyos numerikus mondatokat, coordinationt, ellipszist, nested attributiont, conditional clause-t és negációt.

- Held-out SHA-256: `CA95ED2EA03EC35D40C22B565377CEDD308632E0E7DE05898CB4AAEBF4694209`
- Adapter pre-first-pass SHA-256: `D1F2C2DAC8BF256574A7D13B2316EF053842FCFD25D4123343EF57571252303A`
- First-pass output SHA-256: `8FABCEA0C2E1C0B5BE548F3301027AB1A52FA0BC1922E6D552554E519EE6209B`
- First-pass metrics SHA-256: `CDE8C28BB2CD84E29D5BB7827295D524123CA1676571F50332DADA21B8B00B8E`
- First pass után a binding adapter és a corpus nem változott.

## 6. Négy konfiguráció eredménye

| Metrika | A – determinisztikus kutatási baseline | B – NER | C – NER+morph | D – NER+morph+dependency |
|---|---:|---:|---:|---:|
| Entity precision | 1.000 | 1.000 | 1.000 | 1.000 |
| Entity recall/boundary | 0.947 | 0.947 | 0.947 | 0.947 |
| Entity typing | 0.000 | 0.947 | 0.947 | 0.947 |
| Identity | 0.737 | 0.737 | **0.947** | **0.947** |
| Subject binding | **0.737** | **0.737** | **0.737** | 0.474 |
| Object binding | **0.789** | **0.789** | **0.789** | 0.526 |
| Numeric subject binding | **0.737** | **0.737** | **0.737** | 0.474 |
| Frame semantic entailment | **0.684** | **0.684** | **0.684** | 0.474 |
| Attribution | 0.857 | 0.857 | 0.857 | 0.857 |
| Conditional scope | 1.000 | 1.000 | 1.000 | 1.000 |
| Negation | 0.333 | 0.333 | 0.333 | 0.333 |
| Duplicate frame rate | 0 | 0 | 0 | 0 |
| Unsupported canonical count | 0 | 0 | 0 | 0 |
| Evidence accuracy | 1.000 | 1.000 | 1.000 | 1.000 |

Az A konfiguráció a közös kutatási harness determinisztikus entity/binding baseline-ja; a tokenizálást és number mention felismerést az összehasonlíthatóság miatt ugyanaz a lokális elemző végzi. Nem helyettesíti a külön lefuttatott valódi UTOM kanonikus benchmarkot. A B/C/D közti fő kérdés ettől függetlenül mérhető: D nem javult B/C-hez képest.

A D visszaesés oka nem adatvesztő működés, hanem túlzott abstention: a HuSpaCy dependency fa magyar ellipszis/orphan/coordination szerkezeteknél sokszor nem adott olyan közvetlen alanykapcsolatot, amelyet a conservative policy elfogadhatott volna. A policy lazítása a first pass után tilos volt és nem történt meg.

## 7. Entity fusion és morphology

- HuSpaCy NER span csak ismert PER/ORG/LOC típusnál kerül candidate listába.
- Újsorokat átfogó vagy ismeretlen típusú span elutasításra kerül.
- Minden span raw offsettel rendelkezik.
- C/D konfigurációban a lemma javította a ragozott hely- és szervezetnevek identity pontosságát 0.737-ről 0.947-re.
- Kézi agresszív általános suffix stripping nincs; csak a kísérleti possessive `-é` és dative végződés utóellenőrzése szerepel, kanonikus írás nélkül.

## 8. Attribution, conditional és negation

- Attribution accuracy: 0.857 mindhárom HuSpaCy konfigurációban.
- A reporting verb és source külön candidate mező.
- Nested attribution megmarad több külön sorban, de proposition-span szintű routing még nem production-érett.
- Conditional scope accuracy: 1.000 a frozen készleten.
- Negation accuracy: 0.333; ez egyértelmű további kutatási blocker.
- A `ha`/`amennyiben` és conditional verb morphology candidate-ként használható, de `bár`, `miközben`, `annak ellenére` scope-jának frame-szintű megőrzése még nem bizonyított.

## 9. REAL_WORLD_ARTICLE_003 diagnosztika

Ez nem generalizációs bizonyíték, és fejlesztési tuning nem történt rá.

- `47,3 százalékot` → `Flávio Bolsonaro` → `szerez`: D helyes, dependency-coordination.
- `45,16 százalékot` → `Lula` → `szerez`: D helyes, dependency-coordination.
- A 100%, 7,5%, 50%, 2,1%, 2,2%, 21% és 40% említések többségénél D abstainelt, amikor nem tudott biztonságos subjectet igazolni.
- NER/morph javította a teljes személyneveket (`Ronaldo Caiado`, `Renan Santos`) és több ragozott identityt.
- Person/location határhibák továbbra is előfordulhatnak; HuSpaCy nem safety authority.
- Media attribution jelöltek (`CNN`, `Guardian`) elérhetők, de a nested proposition span pontossága nem érte el a production gate-et.
- Conditional status candidate elérhető, kanonikus státuszra nem vetült ki.

## 10. Evidence integrity

Minden entity és numeric frame esetén ellenőrizve:

`rawSource.slice(start, end) === evidenceText`

- A: 33/33
- B: 33/33
- C: 33/33
- D: 33/33
- Összesen: **132/132**, failure: 0.

`EVIDENCE SAFETY: PASS`

## 11. Runtime

| Mérés | Eredmény |
|---|---:|
| Worker model load | 1025 ms |
| 10 cikk | 23.42 ms/cikk; 42.70 cikk/s |
| 100 cikk | 22.86 ms/cikk; 43.75 cikk/s |
| 500 cikk | 23.00 ms/cikk; 43.48 cikk/s |
| First-pass peak RSS | 636 MB |

- 2 GB: elkülönített egy workerrel lehetséges, teljes Node/Next/MySQL hoston szűk.
- 4 GB: egy worker, bounded queue és circuit breaker mellett reális kutatási/korlátozott runtime cél.
- 8 GB: kényelmes egy workerhez és alkalmazási komponensekhez.

## 12. Licenc checkpoint

- HuSpaCy library: Apache-2.0.
- `hu_core_news_md`: CC BY-SA 4.0.
- Attribution notice szükséges.
- Modellfájl/container/image továbbadásánál redistribution és share-alike kötelezettség vizsgálandó.
- SaaS/server-side használatnál a modell nem feltétlenül kerül átadásra, de a pontos szolgáltatási és image-distribution modellhez attorney review szükséges.
- Launch előtt kötelező: verzió/hash pin, licence notice, SBOM, belső artifact mirror és jogi ellenőrzés.
- Stanza magyar modell ebben a kutatásban nem szerepelt.

Források: [HuSpaCy repository](https://github.com/huspacy/huspacy), [HuSpaCy FAQ](https://huspacy.github.io/recipes/faq/), [HuSpaCy models](https://huspacy.github.io/models/).

## 13. Regressziós eredmények

- Célzott Round 1–2.2 és cross-domain: 21/21 PASS.
- Teljes offline suite: 490/490 PASS.
- Core/Dense benchmark: PASS, változatlan kanonikus safety.
- Korábbi frozen held-out: PASS; evidence 1.000, truly unsupported 0, false conflict 0.
- TypeScript: PASS.
- Import check: PASS.
- ESLint: 0 error; 407 warning.
- `npm audit --omit=dev`: 0 vulnerability.
- Teljes `npm audit`: 5 HIGH, kizárólag dev lint/tooling láncban.
- `npm run check`: PASS.
- Production build: 75/75 route PASS.
- Disposable MySQL 8.0.46 wrapper: 59 PASS / 0 FAIL / 1 environment SKIP.
- Egyetlen SKIP: FFmpeg executable nem érhető el.

## 14. Döntés és következő kutatási feltétel

D nem javította a subject bindinget, numeric bindinget vagy attributiont B/C-hez képest. Bár evidence safety és canonical safety stabil, az efficacy feltétel nem teljesült.

Következő vakteszt előtt külön, új fejlesztési korpuszon kell kutatni:

1. Hungarian orphan/conj/ellipsis dependency reconstruction;
2. frame-szintű negation scope;
3. nested attribution proposition span;
4. agreement-alapú confidence policy, amely csak több független jel egyezésekor oldja fel az abstentiont;
5. új, ezektől elkülönített held-out készlet előzetes befagyasztása.

`HUSPACY ASSISTED BINDING RESEARCH: COMPLETE`

`DEPENDENCY-ASSISTED BINDING BENEFIT: NOT PROVEN`

`PRODUCTION DEPENDENCY HIGH: RESOLVED`

`RECOMMENDED ARCHITECTURE: C – MORE RESEARCH`

`NEXT_REAL_WORLD_BLIND_TEST_READY: NO`
