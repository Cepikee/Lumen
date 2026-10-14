# UTOM V2.2 – Local NLP Feasibility Bake-off

## Végső döntés

`LOCAL NLP BAKE-OFF: COMPLETE`

`RECOMMENDED ARCHITECTURE: C – NONE OF THE ABOVE / MORE RESEARCH`

`PREFERRED RESEARCH CANDIDATE: HuSpaCy hu_core_news_md, candidate-only persistent worker`

`NEXT_REAL_WORLD_BLIND_TEST_READY: NO`

A HuSpaCy egyértelműen a jobb helyi NLP-jelölt: a befagyasztott, tíz témás held-out készleten jelentősen javította az entitás-, szereplő–szám- és attribúciójelölteket, miközben gyorsabb és kisebb memóriaigényű volt a Stanzánál. B1 mégsem igazolható: ebben a bake-offban az NLP csak jelölteket adott, a kanonikus UTOM-projekcióba nem került bekötésre, ezért teljes pipeline-szintű szemantikai javulást nem bizonyított. B2-t a gyengébb erőforrásprofil és a magyar Stanza-modell adatlicencének kereskedelmi bizonytalansága is kizárja.

## 1. Befagyasztott kiindulás

- Branch: `develop/utom-recovery`
- Local HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Remote HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Working-tree státusz SHA-256 a mérés előtt: `06EDA2B2905D0B968AFC73519D7B1BD9B12DE3E864883764F4E92B841BC119B5`
- Round 3 állapot: commitolatlan, változatlanul megőrizve.
- Commit/push: nem történt.
- Production, production DB, fizetős AI és külső AI/provider: nem érintett, 0 hívás.

Az intelligence-fájlok hash-e a mérés előtt és után azonos:

| Fájl | SHA-256 |
|---|---|
| `lib/v2/deterministic-semantic.js` | `456004DBE83ABBAD63523C08B8047BA849089C91142E40F38264B75764126C72` |
| `lib/v2/entity-extraction-provider.js` | `88CAB2995E4EA5F3B01DB7CEAB59ED835C7ED24328E06D682750001EDD2AA14B` |
| `lib/v22/deterministic-text-provider.cjs` | `DEDE26749235C61D62E6C89E8F7F9F3214672139E5839DDED120CDFE89793D4E` |

A teljes befagyasztási rekord: `00_state_freeze.json`.

## 2. Kísérleti környezet és izoláció

- WSL Ubuntu 24.04, Python 3.12.3.
- CPU-only PyTorch `2.14.1+cpu`; CUDA nem elérhető és nem szükséges.
- HuSpaCy `0.12.1`, `hu_core_news_md 3.8.0`.
- Stanza `1.15.0`, magyar tokenize/POS/lemma/depparse/NER csomag.
- Minden Python-csomag és modell a repositoryn kívüli `/tmp` környezetbe került; package-lock nem változott.
- A generikus Stanza telepítő első próbálkozása CUDA-csomagokat kezdett kérni. A folyamat azonnal megszakadt, a részleges környezet törölve lett, majd explicit CPU-only Torch-csal épült újra.
- Az adapter kizárólag candidate annotationt ad. Nem módosít adatbázist, kanonikus claimet, eventet, relationt vagy conflictot.

## 3. Befagyasztott held-out készlet

Tíz, az adapter első futása előtt rögzített téma: gazdaság, közlekedés, egészségügy, sport, tudomány, energia, bíróság, vállalat, időjárás és politika.

- Korpuszhash: `39AFB634B5B7232CE8B4B71F13DF1DA41DED735CAEA5473C054A7DFC368CD25B`
- Fejlesztési/tuning használat: nem.
- Az első eredmények mentés után nem lettek felülírva.

| Artefaktum | SHA-256 |
|---|---|
| Determinisztikus first pass | `69AB84832614DEC5D18581C2394937CCD819D0BE0A9CE9FFC66B7DC0C8262F0B` |
| HuSpaCy first pass | `9DCFB3F711878CBD3B74CBBC0ADDB51120254830033F25A133841B3AF9D87D4F` |
| Stanza first pass | `515E770E7675C10AF933C516279D13B684916D43B34DC0B543C6A5BA85B8AF1B` |

## 4. Nyelvi réteg eredményei

| Metrika | Determinisztikus | HuSpaCy | Stanza |
|---|---:|---:|---:|
| Entitás precision | 0.786 | **0.950** | **0.950** |
| Entitás recall | 0.579 | **1.000** | **1.000** |
| Boundary accuracy | 0.579 | **1.000** | **1.000** |
| Type accuracy | 0.579 | **1.000** | **1.000** |
| Identity accuracy | 0.579 | **0.947** | 0.684 |
| Actor binding precision | 0.667 | **1.000** | **1.000** |
| Actor binding recall | 0.400 | **1.000** | **1.000** |
| Numerikus subject binding | 0.400 | **1.000** | **1.000** |
| Dependency precision | 0.000 | **0.600** | 0.563 |
| Dependency recall | 0.000 | 0.529 | 0.529 |
| Attribution precision | 0.500 | **0.857** | **0.857** |
| Attribution recall | 0.333 | **1.000** | **1.000** |
| Conditional scope | **1.000** | 0.900 | 0.900 |
| Negation | **1.000** | **1.000** | **1.000** |

Az NLP-rétegek mondat-, token-, lemma-, morfológiai, POS-, dependency- és NER-annotációt adtak. A dependency-metrika szigorú, lemma-alapú egyezést használ; a determinisztikus action labeljei emiatt nem tekinthetők UD-dependency találatnak.

## 5. Teljes pipeline biztonság és hatás

A három konfiguráció kanonikus kimenete ebben a kísérletben azonos. Ennek oka szándékos: a HuSpaCy és Stanza jelöltek nem léphetnek át az UTOM determinisztikus biztonsági kapuján, mert ilyen adapter-integrációt ebben a feladatban nem implementáltunk.

| Kanonikus metrika | Core | Dense | Korábbi held-out |
|---|---:|---:|---:|
| Entity precision | 0.840 | 0.760 | 0.541 |
| Entity recall | 0.913 | 0.950 | 0.541 |
| Relation precision | 1.000 | 1.000 | 1.000 |
| Relation recall | 1.000 | 1.000 | 0.500 |
| Claim precision | 0.651 | 0.653 | 0.474 |
| Claim recall | 0.609 | 0.517 | 0.231 |
| Event accuracy | 1.000 | 1.000 | 0.750 |
| Evidence accuracy | 1.000 | 1.000 | 1.000 |
| False conflict rate | 0.000 | N/A | 0.000 |
| Truly unsupported count/rate | 0 / 0 | 0 / 0 | 0 / 0 |
| Critical fact recall | 0.775 | 0.682 | 0.382 |

Következtetés: safety-regresszió nincs, de kanonikus efficacy-javulás sincs bizonyítva. Ezért a B1/B2 elfogadási feltétel nem teljesül.

## 6. REAL_WORLD_ARTICLE_003 diagnosztika

A #003 kizárólag diagnosztikai input volt, tuning nem történt.

- Mindkét NLP felismerte a fő politikai szereplőket és több médiaszereplőt.
- A Stanza helyesen különítette el a `Tarcísio de Freitast` személyt és `São Paulo` helyet; a HuSpaCy ezt egy LOC-spanba vonta össze.
- Mindkettő helyesen adott `CNN` attribúciós jelöltet a `CNN szerint` szerkezetre, elkerülve a determinisztikus hibás, hosszú forráscímkét.
- HuSpaCy hibák: `Lula São Paulóban` egy LOC, egy előfordulásban `Flávio Bolsonaro` LOC, `Lula Munkáspártja` PER, `Minas Gerais-t` PER.
- Stanza hibák: `Lula São Paulóban` egy LOC, `Lula Munkáspártja` PER, `Trump Flávio Bolsonaro` egy PER, `Guardiannek` PER.
- A befagyasztott kísérleti numerikus jelöltkereső nem kezelte a `százalék` szót, ezért mindkét #003 diagnosztikában üres lett a numeric binding lista. Ezt utólag nem javítottuk.
- A conditional és negation dokumentumszintű jelöltek jelen vannak, de nem bizonyítanak kanonikus frame-szintű megőrzést.

Ez a diagnosztika megerősíti, hogy HuSpaCy hasznos alap, ugyanakkor önmagában nem zárja le a #003 százalékos kötési és scope-problémáit.

## 7. Evidence integrity

Minden auditált sentence/token/entity span esetén teljesült:

`rawSource.slice(start, end) === textSpan`

| Készlet | Exact / total | Failure |
|---|---:|---:|
| HuSpaCy held-out | 182 / 182 | 0 |
| Stanza held-out | 182 / 182 | 0 |
| HuSpaCy #003 | 2713 / 2713 | 0 |
| Stanza #003 | 2640 / 2640 | 0 |
| **Összesen** | **5717 / 5717** | **0** |

`EVIDENCE SAFETY: PASS`

## 8. CPU-teljesítmény és kapacitás

| Mérés | HuSpaCy | Stanza |
|---|---:|---:|
| Modellbetöltés | 2237 ms | 4388 ms |
| Held-out átlag/cikk | **18.9 ms** | 43.2 ms |
| Held-out token/s | **793.6** | 347.4 |
| Held-out peak RSS | **637 MB** | 928 MB |
| Modellfájlok | **153 MB** | 525 MB* |
| #003 idő/cikk | **1741 ms** | 3019 ms |
| #003 token/s | **1396.8** | 783.6 |
| #003 peak RSS | **767 MB** | **2905 MB** |

`*` A Stanza könyvtárban az unpackolt komponensek mellett a letöltött archive is szerepelt; produkciós csomagolásnál ez csökkenthető, de a mért runtime memória ettől független.

- **2 GB:** HuSpaCy egyetlen elkülönített workerben lehetséges, de Node + MySQL + Next mellett szűk. Stanza nem ajánlható.
- **4 GB:** HuSpaCy egy workerrel, bounded queue-val reális. Stanza a #003 2.9 GB peak miatt kockázatos.
- **8 GB:** HuSpaCy kényelmes; Stanza technikailag futtatható, de a kétszeres latency és nagy peak miatt nem indokolt.
- Transformer/GPU variáns nem lett telepítve; ehhez a döntéshez nem szükséges, és a CPU-first cél ellen hatna.

## 9. Node/Next integrációs kísérlet

A tényleges harness Windows Node.js-ből WSL Python workerhez JSONL stdio csatornát használt.

Mindkét konfigurációnál:

- egy modellbetöltéssel két egymást követő kérés sikerült;
- hibás JSON kontrollált hibát adott;
- a worker kényszerített leállítása után az alkalmazási viselkedés determinisztikus-only abstentionre esett vissza;
- az újraindítás és az azt követő kérés sikerült;
- kanonikus írás: 0.

Ajánlott későbbi architektúra: egy külön, tartós, helyi worker/sidecar; bounded queue; kérés-időkorlát; health check; restart/backoff; circuit breaker; szigorúan verziózott annotation contract; hiba esetén determinisztikus-only fallback. Process/article indítás nem elfogadható a betöltési költség miatt.

## 10. Licenc és üzemeltetési megállapítások

| Elem | Licenc/állapot | Következmény |
|---|---|---|
| HuSpaCy könyvtár | Apache-2.0 | Alapvetően kereskedelmi használatra alkalmas. |
| `hu_core_news_md` | CC BY-SA 4.0 | Attribution és share-alike/redistribution kötelezettség; jogi csomagolási review szükséges. |
| spaCy | MIT | Megengedő. |
| Stanza könyvtár | Apache-2.0 | Megengedő kódlicenc. |
| Stanza magyar modellek | modellkártya Apache-2.0, Stanza dokumentáció ODC-By megjegyzéssel; training-data licenc külön ellenőrzendő | Nem tekinthető automatikusan production-clearednek. |
| UD Hungarian Szeged | CC BY-NC-SA 3.0 | Kereskedelmi használat/redistribution komoly jogi blocker lehet. |

Elsődleges források: [HuSpaCy repository](https://github.com/huspacy/huspacy), [HuSpaCy model installation](https://huspacy.github.io/models/install_md/), [HuSpaCy FAQ](https://huspacy.github.io/recipes/faq/), [Stanza model download](https://stanfordnlp.github.io/stanza/download_models.html), [Stanza repository](https://github.com/stanfordnlp/stanza/blob/main/README.md), [Stanza model performance and rights note](https://stanfordnlp.github.io/stanza/performance.html), [UD Hungarian Szeged](https://universaldependencies.org/treebanks/hu_szeged/index.html), [Stanza Hungarian model card](https://huggingface.co/stanfordnlp/stanza-hu/tree/main).

Production előtt szükséges: exact wheel/model verzió és SHA pin, runtime letöltés tiltása, belső artifact mirror, SBOM, licence notice, sérülékenységfigyelés és reprodukálható offline telepítés.

## 11. Döntési mátrix

| Opció | Held-out nyelvi javulás | Kanonikus javulás bizonyított | Evidence/safety | CPU/RAM | Licenc | Döntés |
|---|---|---|---|---|---|---|
| A – determinisztikus-only | Referencia | Igen, jelenlegi szint | PASS | Legkisebb | Jelenlegi | Biztonságos fallback |
| B1 – HuSpaCy-assisted | Erős | **Nem** | Candidate-only PASS | Legjobb NLP-opció | Review kell | Még nem fogadható el |
| B2 – Stanza-assisted | Erős, identity gyengébb | **Nem** | Candidate-only PASS | Rosszabb, #003 2.9 GB peak | **Nem tisztázott / NC kockázat** | Elutasítva |
| C – további kutatás | N/A | Következő kísérletben bizonyítandó | Safety-first | HuSpaCy fókusz | Előbb tisztázandó | **Ajánlott** |

## 12. Quality gate

- Célzott Round 1–2.2 + cross-domain regresszió: 21/21 PASS.
- Teljes offline suite: 490/490 PASS.
- TypeScript: PASS.
- Import check: PASS.
- ESLint: 0 error; meglévő warningok maradtak.
- `npm run check`: PASS.
- Production build: 75/75 route PASS.
- MySQL 8.0.46 integration: 59 PASS / 0 FAIL / 1 environment SKIP.
- Egyetlen SKIP: a valós FFmpeg executable nincs jelen.
- `npm audit --omit=dev`: 1 high (`source-map-js`).
- Teljes `npm audit`: 6 high (`source-map-js`, illetve a dev lint lánc `braces` függőségei).
- `git diff --check`: tartalmi whitespace hiba nincs; csak meglévő LF→CRLF figyelmeztetések.

## 13. Következő, külön engedélyezendő kutatási lépés

Készítsünk egy feature-flagelt, továbbra is candidate-only HuSpaCy adaptert, amely a dependency/NER jelölteket a meglévő determinisztikus UTOM safety gate bemenetére fordítja. A százalékos/numerikus kötést és a frame-szintű attribúciót, negációt és feltételességet új, előre befagyasztott held-out készleten kell mérni. Csak akkor indokolt új valódi vakteszt, ha ez a réteg kanonikus claim/event/relation metrikában is javulást mutat, evidence és unsupported/false-conflict regresszió nélkül.

`LOCAL NLP BAKE-OFF: COMPLETE`

`RECOMMENDED ARCHITECTURE: C – NONE OF THE ABOVE / MORE RESEARCH`

`NEXT_REAL_WORLD_BLIND_TEST_READY: NO`
