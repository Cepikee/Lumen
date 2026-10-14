# UTOM V2.2 – Semantic Role & Scope Safety Closure

Eredmény: **PARTIAL**. Az új rövid held-out mezőszintű biztonsága javult, de a teljes cikkes diagnosztika bizonyított HIGH hibákat mutat. Következő valódi vakteszt: **NO**. Production canonical projection: **OFF**.

## Kiindulás és változatlanság

- Branch: `develop/utom-recovery`; local és élő remote HEAD a kezdéskor: `d145120c6e044b4f25d1d7b94e87846652ef80ba`.
- A munkafa már kezdetkor módosított volt; nem állítjuk, hogy a checkpoint tiszta checkoutján dolgoztunk. A kezdeti státusz, binary diff SHA-256, package/lock, production intelligence, korábbi research/evaluator/gold/first-pass hash-ek: [00_baseline_freeze.json](00_baseline_freeze.json), 118 fájl.
- Új research successor fájlok készültek; a korábbi `morph-*` implementáció és korábbi artefaktumok nem íródtak át. Az AGENTS.md, CLAUDE.md és docs.zip változatlan.
- 42 új fejlesztési szöveg és valós HuSpaCy-annotáció; ebből 13 célzott binder-regressziós teszt. További 4 evaluator-teszt hibás szerep/előjel/owner/scope/condition és duplikáció injektálásával bizonyítja, hogy a `resolved` címke önmagában nem eredmény.
- Az új held-outot az implementáció lezárása után írtuk meg: 36 eset, 45 proposition, 30 szám, 27 elvárt néventitás-előfordulás, 15 témacímke. Economy/finance, sport, weather, court, health, politics, science, company, transport és energy is szerepel.
- [01_final_freeze.json](01_final_freeze.json): 9 fájl, köztük binder/evaluator/gold/raw input/runner és worker. Az első futás után ezek nem módosultak. [02_first_pass_raw.json](02_first_pass_raw.json) egyszer íródott, kizárólagos fájllétrehozással; nem volt javított második held-out eredmény.
- A gold és a szövegek ugyanazon Codex-kutatási körben készültek. A gold külön fájl, az extractor nem kapta meg; ez input-szeparációt bizonyít, **nem független külső szakértői adjudikációt**. A lexikai újdonság nem teljes mintacsalád-függetlenség.

## Mi változott a research binderben?

Megmaradt az E architektúra: HuSpaCy NER+morphology → determinisztikus clause/proposition binder → safety/abstention. Nincs dependency-head alapú autoritatív szerepkötés, új NLP-modell vagy canonical writer.

1. Raw szövegalapú signed numeric reprezentáció ASCII/Unicode/mínusz/plusz formákkal; külön absolute, delta, lower/upper bound, range és from→to, saját evidence-dzsel.
2. Entity és semantic role szétválasztása. Locative referens nem automatikus actor; explicit nominative rendőrség lehet generikus intézményi actor, de nem hamis named ORG.
3. Külön reportingActor/source, recipient, content és reportingVerb. A dativusi/instrumentalis/elativusi címzett nem automatikus beszélő. Bizonytalan többnéves span esetén abstention.
4. Numerikus tulajdonos számonként: process/completion, policy/tariff, threshold, time, population, entity, location/property vagy unresolved. Az owner/property választása nem egyetlen frame-subject másolása minden számra.
5. `grammaticalMood` és `conditionality/conditionalTrigger` külön mezők. Cnd önmagában nem logikai ha. Külön reported/promised/possible/hypothetical/expected/counterfactual/conditional modalitáslista.
6. Egyszerű magyar/ASCII/gondolatjeles idézet és előtte/utána álló beszélő egy reprezentációba kerül. Identity csak megerősített nominative/same-article formából; a hibás inflected lemma nem automatikus canonical név. Pronoun/generic noun guard.
7. Szigorúbb, elkülönített evaluator: egy-egy illesztés, rögzített gold nevezők; actor/source/recipient, numeric owner/property/value/sign/valueKind, raw scope, Cnd és logikai condition külön mérés. Üres resolved halmaz aránya null, nem0.

## Az öt HIGH finding állapota

| Korábbi ID | Célzott javítás | Lezárás |
|---|---|---|
| MCB-F001 | Signed value/delta/range/from→to representation; 30/30 held-out value és sign helyes | PASS a mért fejlesztési/held-out tartományban; nem univerzális bizonyítás |
| MCB-F002 | Locative ≠ actor, generikus intézményi actor külön | PARTIAL: a locative példák biztonságosak, birtokos/névutós szerkezetekben továbbra is téves actor |
| MCB-F003 | Recipient külön a reporting source-tól; source9/10, recipient7/7 held-out | PARTIAL: hosszú idézeteknél hibás source; puszta nyelvtani esetből hamis recipient |
| MCB-F004 | Process/threshold/year/population/entity számonkénti kötés | PARTIAL: held-out22/30 biztonságos owner; #003 büntetés-időtartam→age és év→tarifa maradt |
| MCB-F010 | Cnd ≠ logical conditional; 45/45 rövid scope helyes | PARTIAL: a célzott összemosás megszűnt, de counterfactual és közbevetett ha-scope még hibás |

## Frozen held-out számai

| Mérés | Eredmény |
|---|---:|
| Actor gold coverage | 11/18 |
| Source gold coverage | 9/10 |
| Recipient gold coverage | 7/7 |
| Raw proposition/content scope | 45/45 |
| Logical conditional / grammatical Cnd / polarity | egyenként45/45 |
| Numeric value / sign / valueKind | egyenként30/30 |
| Numeric owner / property | egyenként22/30 |
| Named entity boundary precision | 26/26 |
| Named entity coverage | 26/27 |
| Egyedi evidence raw-offset egyezés | 177/177,0 hiba |
| Resolved teljes frame | 11/45 |
| FALSE_RESOLVED frame | 0/11 |
| FALSE_RESOLVED numeric binding | 0/22 |
| Hibás nem-null role assertion | 0/27 |
| Combined FALSE_RESOLVED | 0/60 döntés =0%; átfedő, korrelált nevező |
| HIGH false-resolved az új held-out mért contractjában | 0 |

[Teljes gépi mérés](03_evaluation.json), [36/36 eset tartalmi review-ja](HELDOUT_MANUAL_REVIEW.md). A `Sára` nevet a nyelvi modell többször Sbl-nek elemzi; az abstention emiatt owner/source/actor lefedettséget veszít, nem hamis identityt gyárt. Az annotációs request ID-k1..36, a szövegek s01..s36; a frozen sorrend megőrzi a kapcsolatot.

Az evaluator **nem teljes entailment checker**. A kézi review külön feltárta a `fog` segédige lexikai action helyetti használatát, a threshold tévesen örökölt igéjét, a volna túl erős counterfactual címkéjét és a Szerintük elveszett reporting kontextusát. Ezeket nem rejti el a fenti nulla. Egyetlen kis szintetikus készletből nem állítunk általános százalékos teljesítményt.

## #003: javulás és fennmaradó veszély

Az ismert cikk csak a freeze után kapott diagnosztikai futást. [Teljes raw](04_article003_diagnostic.json), [részletes ellenőrzés](ARTICLE003_DIAGNOSTIC_REVIEW.md).

- A100% process/completion; Flávio47,3% és Lula45,16% külön owner: helyes.
- A tagadott „elkövetett volna” Cnd, denied, logical conditional=false: célzott javítás helyes. Actor unresolved, counterfactual túl erős.
- 186 frame,39 resolved;29 szám,9 resolved numeric binding;605/605 evidence pontos.
- Legalább15/39 resolved frame hibás actor/property/polarity/modalitást tartalmaz; legalább1/9 resolved numerikus kötés hibás (27 éves büntetés→age). Ez diagnosztikai alsó korlát, nem az új held-out mérésének része.
- Unresolved teljes frame-ben is marad téves nem-null source/recipient. Lula helyett Bolsonaro vagy Lula Munkáspártja lesz beszélő; megszakításokkal/szempontjából/gyülekezőhelynek címzettként jelenik meg.
- Entity typing/boundary instabil: Lula→organization, Flávio→location, Miolo→person, összetett nevek szétesése.

## Új, freeze után rögzített findingek – nem javítva

Mind általánosítható hibacsalád, production projection OFF. A következő körben új fejlesztési anyag és új frozen held-out szükséges; a mostani mérés nem írható át.

| ID | Severity | Bizonyíték | Valószínű root cause / érintett modul |
|---|---|---|---|
| RSS-F001 | HIGH | #003 frames25/50/54/56/103/104/149/172: birtokos/téma/célpont actor | `chooseActor` túlzottan a nominative named referensre támaszkodik; noun-phrase/possessor/postposition és valódi generikus alany nincs összevetve; role-scope-binder |
| RSS-F002 | HIGH | #003 frames53/82: hibás speaker;5/82/155: hamis recipient | Quote merge túl széles/mondathatáron átlép, reporting nem megfelelő clause-ból; recipient minden Dat/Ins/Ela szó lehet; clauses/bind |
| RSS-F003 | HIGH | #003 frame93:27→age; frame138:2025→tariff_rate (utóbbi unresolved) | `éves` közelsége nem age bizonyíték; policy prioritás felülírja az év típust; extractNumbers/numeric owner |
| RSS-F004 | HIGH | #003 frames66/139/162: mellékes negáció átkerül a fő állításra | Token-szintű nem/sem teszt, nincs predikátumhoz kötött negáció; bind |
| RSS-F005 | HIGH | #003 frame22 scope hiány;135/184 cél/opció asserted; held-out s24/s28 counterfactual | Egy-clause hatókör/nyelvtani címke nem elég jelentéshez; modalities/condition propagation |
| RSS-F006 | HIGH | #003 Lula ORG, Flávio LOC, Miolo PER; held-out Sára Sbl omissions | A modell entity/case címkéjének nincs elég független surface és kontextusellenőrzése; namedEntities/references; HuSpaCy annotáció |
| RSS-F007 | MEDIUM | held-out s19 threshold action=kap; s29–32 action=fog; s33 reportingContext=false | Ellipszis túl általános, infinitive lexikai predikátum kihagyás, pronominális attribúció hiány; bind/verb/clauses |
| RSS-F008 | HIGH, mérési korlát | 0/60 mezőhibaarány mellett a fenti nem mért szemantikai hibák | Gold/evaluator nem méri action/modality teljes jelentését, nincs külső adjudikáció; role-scope-evaluate és kutatási módszer |

A findingek átfedhetnek ugyanazon frame-ben. Nem összegezhetők egymástól független hibás állítások számaként. A stop rule értelmében ezek dokumentált nyitott kutatási hibák, nem automatikusan végrehajtandó utólagos javítások.

## Worker és futásidő

A meglévő bounded input/queue/timeout/crash/restart/malformed/fallback védelem változatlan. A morphology unit tesztek és 6 élő worker-próba sikeres; a dependency-label poisoning nem változtatja meg a binder eredményét. [Élő safety evidence](10_live_worker_safety.json).

[Runtime JSON](05_runtime.json): hu_core_news_md 3.8.0, load 1224,96 ms; cold worker + #003 annotációs kérés 5706,37 ms. 100 teljes szöveges kérés 177,12 s; warm átlag 1771,20 ms, P50 2101,86 ms, P95 2614,54 ms; Python peak RSS 592,6 MiB. Összesen 1 178 554 UTF-16 kódegység és 192 044 token. A warm idő a bindert is tartalmazza, a cold kérés ideje csak az annotációig tart. Három változatlanul kapott szöveg (#001/#002/#003) ismétlése csak terhelési méréshez, nem új szemantikai minta vagy tuning. #002 a kapott részlet. Párhuzamos ellenőrzések futottak, ezért ez nem kontrollált gyorsulás/regresszió állítás. Új dependency/model telepítés nem történt.

## Regresszió és ellenőrzés

- Új binder13 + evaluator4 =17 új teszt; korábbi morphology15 változatlan. Az offline suite tartalmazza a cross-domain foundation/hardening és a REAL_WORLD_001 Round1/2/2.1/2.2 regressziókat.
- Teljes offline: **522/522 PASS,0 FAIL,0 SKIP**.
- TypeScript, import check, `npm run check`: **PASS**.
- ESLint: **0 error,412 warning**; az új research fájlok célzott utóellenőrzése is lefutott.
- Production build: **75/75 PASS**.
- Core/Dense/historical held-out: a korábbi production deterministic metrikákkal pontos egyezés, régi fájlok felülírása nélkül; [06_historical_regression.json](06_historical_regression.json).
- `npm audit --omit=dev`: **0 vulnerability**.
- Teljes `npm audit`: **5 HIGH +2 CRITICAL**, exit1; a meglévő fejlesztői lint/glob/braces és concurrently/shell-quote láncokban. Package/lock változatlan; nincs audit-fix vagy új függőség. A teljes audit nem nevezhető zöldnek, a production dependency gate igen.
- Disposable WSL MySQL **8.0.46** full wrapper: **60 teszt, 59 PASS / 0 FAIL / 1 environment SKIP** (hiányzó FFmpeg executable). A teljes wrapper exit0, nem csak célzott részteszt. A saját `/tmp/utom-r22` adatkönyvtárú, 33307 portú teszt-DB normál leállítással lezárva; más DB-hez nem nyúltunk. A korábbi hibás futások naplói megmaradtak.

Az első MySQL-kísérlet a párhuzamos build miatt hiányzó `.next` build ID-nál megállt; a második M13 feature-OFF HTTP kérés timeouttal megállt. A másodiknál a fixture 3306 portot választott: 127.0.0.1:3306 már másik MySQL folyamaté volt, míg a teszt Next-je `[::]:3306`-on hallgatott. A harmadik kísérlet az ON kérésre egy korábbról futó szerver 404 válaszát kapta. Mindhárom hibás napló megőrizve. A saját 3305/3306 tesztfolyamatok leállítva, a másik DB és a korábbi, nem ehhez a futáshoz tartozó folyamatok érintetlenek.

Ezután kizárólag a `tests/integration/mysql-v2-http-m13.test.cjs` tesztinfrastruktúrát javítottuk (RSS-ENV001). Root cause: `Date.now()` két utolsó számjegyéből választott, nem ellenőrzött 3210–3309 port és a Windows npm/cmd parent leállítása után hátramaradó Next gyermekfolyamat. Javítás: OS által kijelölt szabad loopback port, közvetlen Node/Next child, saját ready jel és korai kilépés figyelése, bounded fetch, megvárt leállítás; a túl korai, tényleges teszt előtt kiírt PASS eltávolítva. Az ON/OFF státusz és response-contract assertionök nem változtak. A célzott valós M13 teszt PASS, a célzott ESLint PASS. A változtatás előtti hash külön `m13_harness_before.json` fájlban van. Ez nem befagyasztott intelligence/evaluator/gold fájl: azok továbbra is változatlanok. A tracked diff most ettől az egy új tesztinfrastruktúra-javítástól is különbözik a kiindulástól.

## Biztonsági döntés

```text
SEMANTIC ROLE & SCOPE SAFETY CLOSURE: PARTIAL
SIGN SAFETY: PASS
ACTOR ROLE SAFETY: FAIL
ATTRIBUTION SOURCE SAFETY: FAIL
NUMERIC OWNERSHIP SAFETY: FAIL
LOGICAL CONDITIONAL SAFETY: FAIL
ENTITY BOUNDARY SAFETY: FAIL
SEMANTIC ENTAILMENT SAFETY: FAIL
FALSE RESOLVED RATE: 0/60 on frozen held-out measured fields; diagnostic has at least 15/39 wrong resolved frames
EVIDENCE SAFETY: PASS
OLD REGRESSION: PASS
MYSQL 8 FULL GATE: PASS (59 PASS, 0 FAIL, 1 FFmpeg environment SKIP)
PRODUCTION DEPENDENCY AUDIT: PASS
RECOMMENDED ARCHITECTURE: HuSpaCy NER + morphology, conservative deterministic proposition binder + explicit safety/abstention; research-only, canonical OFF
NEXT_REAL_WORLD_BLIND_TEST_READY: NO
```

A PASS-ek a mért tartományra vonatkoznak. A byte/offset evidence pontossága nem bizonyítja a szemantikai következtetés helyességét. Az új rövid held-out0 HIGH false-resolved eredménye szükséges, de az ismert teljes cikkes HIGH hibák és az értékelő korlátai miatt nem elég az engedélyezéshez.

## CURRENT POSITION / NEXT ACTION / RESUME FROM HERE

Az új role/scope implementáció fejlesztési és egyszeri frozen first-pass szakasza lezárult. Binder/evaluator/gold/first-pass immutable; production integráció továbbra is tiltott. A következő művelet a tulajdonosi/műszaki review a `RSS-F001–RSS-F008` findingekről, különösen a possessive actor, recipient-valency, age/duration és negációs scope kérdésekről. Következő fejlesztési kör csak külön felhatalmazással, új development és új, erősebb — lehetőleg külön szakértő által címkézett — held-out mellett. Ne javítsuk visszamenőleg ezt a mérőcsomagot, és ne indítsunk új valós vaktesztet.

Commit0; push0; deploy0; production DB érintés0; fizetős AI0; külső AI/provider0. A lokális HuSpaCy worker kizárólag nyers szöveget annotált; a numerikus/szerep/gold címkék nem kerültek bemenetébe.

## A változtatások konkrét helye

- Új research implementáció: `scripts/experimental/role-scope-binder.cjs`.
- Új, elkülönített mérés: `role-scope-development.cjs`, `role-scope-heldout-prepare.cjs`, `role-scope-heldout-run.cjs`, `role-scope-evaluate.cjs`, `role-scope-measure.cjs`, mind a `scripts/experimental/` alatt.
- Új regressziók: `tests/unit/v22-role-scope-research.test.cjs`, `tests/unit/v22-role-scope-evaluator.test.cjs`; tényleges modellannotációk: `tests/fixtures/role-scope/development-annotations.json`.
- Tesztinfrastruktúra-javítás: `tests/integration/mysql-v2-http-m13.test.cjs`; az intelligencia és a mérési gold befagyasztásán kívüli HTTP-process lifecycle.
- E teljes bizonyítékcsomag: `docs/UTOM_V2_2/role_scope/`.
- Alkalmazásbeli importkeresés az `app`, `lib`, `components`, `hooks` alatt: az új research binder/workerre nincs hivatkozás. A production intelligence és az összes baseline-hashben felsorolt régi research fájl változatlan.

## Végleges checkpoint

Az M13 tesztindító javítása után a teljes `npm run check` ismét lefutott: exit 0; TypeScript/import/ESLint PASS, 522/522 offline PASS, build 75/75 PASS. Ez a végleges kódállapot ellenőrzése, és a MySQL full wrapper befejezése után futott, ezért nem ütközött a futó HTTP-tesztek buildjével. Napló: `final-check.log`.

[11_final_integrity.json](11_final_integrity.json): a 118/118 kiinduló védett fájl és a 9/9 új frozen kód/input/gold hash egyezik. A kiinduló tracked diff hash az egyetlen dokumentált M13 tesztindító-javítás kizárásával változatlan. A baseline package/lock, production intelligence, régi research/evaluator/first-pass és user-owned fájlok sértetlenek. Az összes új JSON artefaktum hash-e rögzítve. A saját worker és tesztwebszerverek leálltak; a saját MySQL tesztpéldány leállítva.

Végleges állapot: **SEMANTIC ROLE & SCOPE SAFETY CLOSURE: PARTIAL**. **MYSQL 8 FULL GATE: PASS**. **NEXT_REAL_WORLD_BLIND_TEST_READY: NO**. A következő folytatási pont változatlanul a fenti RSS-F001–RSS-F008 tulajdonosi/műszaki review; semmit nem javítunk a befagyasztott első futás eredménye alapján ebben a körben.
