# UTOM V2.2 – Morphology-assisted clause binding research

## Döntés és hatókör

A kísérleti E réteg a saját készítésű, fejlesztés után befagyasztott készleten lényegesen több helyes alany–szám kötést és pontosabb tagmondathatárokat adott, mint B. **A teljes biztonsági/architekturális előny még nincs bizonyítva.** Hibás, `resolved` státuszú szemantikai kötések maradtak. Production integráció nem készült; a kanonikus kivetítés minden konfigurációban le van tiltva.

**MORPHOLOGY-ASSISTED CLAUSE BINDING: PARTIAL**

**CLAUSE-BINDING BENEFIT: NOT PROVEN** – a részfeladat mérhető javulása bizonyított ezen a készleten; a teljes előírt safety és entailment feltétel nem.

**HUSPACY VALUE FOR NER/MORPHOLOGY: PROVEN** – e szintetikus mintában a pontos, helyesen típusozott entitásfelismerés 6/34-ről 34/34-re nőtt. Ez nem általános magyar hírszöveg-teljesítményállítás; a valós #003 cikkben típus- és identitáshibák maradtak.

**RECOMMENDED ARCHITECTURE: C – MORE RESEARCH**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO**

## Befagyasztás és reprodukálhatóság

- Branch: `develop/utom-recovery`.
- Local HEAD, remote tracking HEAD és a sessionben lekérdezett tényleges remote branch: `d145120c6e044b4f25d1d7b94e87846652ef80ba`.
- A munkafa már induláskor tartalmazott nem commitolt cross-domain intelligence módosításokat. Nem állítjuk, hogy a futtatott intelligencia azonos a tiszta HEAD-del. A tényleges munkafa hash-e a mérés alapja.
- `00_baseline_freeze.json`: kiinduló státusz, tracked binary diff hash, 38 korábbi és védett fájl hash-e.
- `02_final_freeze.json`: 68 fájl, köztük aktuális `lib/v2`, `lib/v22`, kísérleti binder/worker, értékelő, futtató, új held-out input és gold hash-e.
- `first_pass_started.json`: egyszer használható indításjelző. A futtató meglévő first-pass esetén megtagadja az új futást; a nyers fájlok létrehozása kizárólag `wx` módban történik.
- Az A/B/E nyers JSON-ok az értékelés előtt kerültek lemezre. A runner csak utána olvasta be a goldot. A provider nem kapott ID-t, domaint vagy elvárt mezőt: csak nyers szöveget, illetve nyelvi annotációt.
- A végleges first pass után sem az intelligencia, sem a befagyasztott értékelő nem változott. A későbbi fájlok kizárólag mérési, dokumentációs és ellenőrzési segédek.
- A korábbi first-passok, benchmarkeredmények, HuSpaCy-mérések, `AGENTS.md`, `CLAUDE.md`, `docs.zip`, package és lock állapota megőrzendő; záró hash-ellenőrzés: `11_final_integrity.json`.

## Konfigurációk és módszertani korrekció

| Konfiguráció | Tényleges feldolgozás |
|---|---|
| A | A jelenlegi `deterministic-semantic.extractEntities` + `extractSemanticFrames` |
| B | HuSpaCy NER + lemma/eset + UTOM metadata/type fusion, majd ugyanaz a jelenlegi `extractSemanticFrames` |
| E | Ugyanaz a B entitásréteg + külön kísérleti UTOM clause binder; dependency/head jelek nélkül |
| D | A korábbi kutatás megőrzött történeti referenciája; nem újramért kontroll |

**A korábbi kutatás számai nem közvetlen kontrollok.** A korábbi `huspacy-binding-research.py` A ága saját `baseline_entities` reguláris közelítést használt, és a teljes szöveget HuSpaCy-val elemezte; nem a valódi UTOM A belépő volt. A korábbi értékelőben több „accuracy” gold-lefedettséget jelentett, illetve az `unsupportedCanonicalCount` állandó nulla volt. Ezeket az artefaktumokat nem módosítottuk, de az új döntést nem rájuk alapozzuk.

A fejlesztési halmaz 20 példa, legalább 13 témával, valamint 12 strukturált mutáció. Az új held-out 24 rövid, önálló szöveg, 48 gold proposition, 34 entitásemlítés, 35 számemlítés; 33 számhoz van egyértelmű alany. Saját készítésű, szintetikus és részben szerkezetileg közeli a fejlesztési példákhoz. Nem független külső vakteszt, nem reprezentatív mintavétel. A tartományok között gazdaság, vállalat, választás, sport, időjárás, egészségügy, energia, tudomány, technológia, közlekedés, oktatás, bíróság és rendőrségi ügy is szerepel.

## Befagyasztott első eredmény

P = helyes / kiadott; R = helyes / gold. A kihagyás nem helyes találat. Egy predikció legfeljebb egy gold elemet kaphat; az extra kimenet false positive marad.

| Réteg | A | B | E |
|---|---:|---:|---:|
| Pontos proposition határ P / R | 5/18; 5/48 | 11/22; 11/48 | 47/49; 47/48 |
| Alanykötés P / R | 3/7; 3/43 | 13/20; 13/43 | 38/42; 38/43 |
| Actor/action P / R | 3/7; 3/43 | 13/20; 13/43 | 35/40; 35/43 |
| Tárgy felismerése gold alapján | 0/14 | 1/14 | 11/14 |
| Numerikus alanyjelölt P / R | 1/4; 1/33 | 10/15; 10/33 | 29/32; 29/33 |
| Feloldottnak jelölt numerikus kötés P / R | 1/4; 1/33 | 10/15; 10/33 | 28/31; 28/33 |
| Számérték gold-lefedettség | 15/35 | 15/35 | 34/35 |
| Numerikus jelentéstípus | 9/35 | 9/35 | 33/35 |
| Pontos entitáshatár P / R | 8/10; 8/34 | 34/35; 34/34 | 34/35; 34/34 |
| Helyes típus + pontos határ P / R | 6/10; 6/34 | 34/35; 34/34 | 34/35; 34/34 |
| Típuspontosság a pontos határokon | 6/8 | 34/34 | 34/34 |
| Identitás a pontos határokon | 8/8 | 32/34 | 32/34 |
| Identitás teljes gold-lefedettség | 8/34 | 32/34 | 32/34 |
| Forráshelyesség, hiányzó állításokat is büntetve | 15/48 | 19/48 | 44/49 |
| Forrás + proposition-hatókör | 3/48 | 9/48 | 44/49 |
| Tagadás + kimeneti lefedettség | 16/48 | 20/48 | 48/49 |
| Feltételesség + kimeneti lefedettség | 16/48 | 20/48 | 48/49 |
| Admission/denial különválasztás | 0/1 | 0/1 | 1/1 |
| Feloldott frame gold-mezői, P / R | 1/7; 1/48 | 9/20; 9/48 | 32/39; 32/48 |
| Egyedi evidence span / exact | 18/18 | 57/57 | 189/189 |
| Pontos frame-duplikáció | 0 | 0 | 0 |

### Az értékelő korlátai – az első eredményt nem írtuk át

1. A `resolvedSemanticContract` előre rögzített mezőellenőrzés, **nem teljes szemantikai entailment bizonyítás**. A goldban meg nem adott tárgyat nem bünteti, a `binding` jelző nélküli A/B frame-et alany jelenlétekor tekinti feloldottnak. A jelentés ezért nem nevezi a 32/39-et „igazságpontosságnak”.
2. A nyers JSON `explicitAttributionSource`, `explicitModality`, `explicitTime` részmutatóinak nevezője csak a párosított gold. A/B kihagyásai miatt ez eltérő nevezőket ad. Összehasonlításhoz a közös gold nevező helyes: explicit forrás A=5/13, B=5/13, E=10/13; modalitás A=0/5, B=0/5, E=4/5; explicit idő A=1/4, B=1/4, E=4/4. Ezek dokumentált utólagos értelmezések; a befagyasztott JSON és értékelő érintetlen.
3. Null subject gold esetén csak az egyéni alanykötéstől tartózkodás fogadható el. A raktár helyszínét és a cselekvőt nem szabad összemosni.
4. A `country/city/product` finom típusok, általános sebesség/range/delta/age kategóriák és minden idézetváltozat nem kaptak teljes implementációt/coverage-et. Nem jelentünk teljes zárást.
5. Nincs kanonikus kivetítő és konfliktusmodul bekapcsolva. Canonical count=0 és conflict count=0 **nem bizonyítja** az unsupported/false-conflict biztonságát; ezek a rétegek N/A a kísérletben. A frame-szintű tévedések külön láthatók.
6. A dedup mutató az azonos kulcsú frame-eket méri, nem minden parafrázis szemantikai azonosságát.
7. A gold action-aliasok sem teljes nyelvészeti megoldókulcsok. Például h21-ben a „lehet” modelllemmája „lesz”; emiatt az action-mezőpont elveszik akkor is, amikor a második frame modalitása megmarad. Ez konzervatív mérési hiba, nem önmagában hamis tény. A h21 első frame modalitásvesztése ettől függetlenül tényleges finding. Utólag a goldot sem írtuk át.

## Emberi felülvizsgálat – minden held-out eset

| ID | E eredmény és korlát |
|---|---|
| h01 | Három személy és három százalék külön; közös action külön evidence-szel |
| h02 | Két hely két hőmérséklettel, action/unit ellipszis helyes |
| h03 | Rendelő/kórház számok helyesen, de a mérési tulajdonos és a cselekvő nincs típusosan különválasztva |
| h04 | Két erőmű termelése helyes; MW durván count kategória |
| h05 | Két vállalat bevétele és örökölt pénznem helyes |
| h06 | Szóval írt gólszámok és ellipszis helyes |
| h07 | Gimnázium/iskola mennyiségei helyesek |
| h08 | „Olcsóbb” → „olcsó” összehasonlítás elveszik; második termék unresolved |
| h09 | Beismerés/tagadás két frame-ben, külön polarity és bizonyíték |
| h10 | **Hibás resolved actor: raktár**; ez helyszín, a megtaláló nincs megnevezve |
| h11 | Tagadás nem folyik át a labor bejelentésére |
| h12 | Két forrás elkülönül; „ezt” előző állításra mutató tárgya hiányzik |
| h13 | Feltétel és következmény elkülönül a tegnapi befejezett eseménytől |
| h14 | Nested source unresolved, nincs téves lapos forrás; lefedettséghiány |
| h15 | Két név közül nem választ önkényesen; „szerinte” unresolved |
| h16 | Ígéret megmarad, de alany hiányzik; „iskolát” generikus darabszám helyett szervezeti jelölt |
| h17 | „Tarifa” nem kap tarifa jelentést; második proposition forrása elveszik. A forrás hatókörének végső emberi megítélése szükséges |
| h18 | Referenciaérték és aktuális személyérték elkülönül |
| h19 | Fotósor kimarad, emoji nem tolja el a raw offsetet |
| h20 | **Címzettből téves forrás**; Júlia ragozott alakjai „Júliá” hibás lemmát kapnak; nincs biztonságos teljes identity merge |
| h21 | Határértékek megmaradnak; örökölt „lehet” modalitása nem kerül át az első frame-re |
| h22 | Holnap/tegnap és future/asserted különválasztás helyes |
| h23 | **Idézet és utólagos beszélőcímke szétesik**; unresolved, három frame a két proposition helyett |
| h24 | **−4-ből +4 lesz, mégis resolved**; a másik hely +2 értéke helyes |

## #003 – kizárólag freeze utáni diagnosztika

`04_article003_diagnostic.json` teljes nyelvi annotációt és A/B/E eredményt őriz. A cikket a binder fejlesztéséhez nem használtuk, utána sem változtattunk szabályt.

- E: 127 entitásemlítés, 217 frame; ebből 89 resolved és 128 unresolved. 657/657 egyedi evidence span exact. A resolved jelölés nem igazságellenőrzés.
- Flávio 47,3% és Lula 45,16% külön és jó személyhez kötődik.
- **A feldolgozottság 100%-a ugyanabban a frame-ben tévesen Flávio eredményéhez kerül.** A helyes két szám önmagában félrevezető sikerkritérium lenne.
- Guardian/CNN: media; rendőrség: official/authority; bíróság: court. Ugyanakkor Lula egy említésben organization, Flávio egy említésben location, Minas Gerais person; ország/város finomtípus nincs.
- A „Kettejüknek” token personként átjut, a teljes név helyenként több entitásra szakad. Metadata-kizárás önmagában nem elegendő.
- `status=conditional && conditionality=false`: 0, de a nyelvtani feltételes mód nem mindig logikai feltétel: a tagadás alatti „elkövetett volna” is conditional flaget kap. Ez szemantikai scope-finding.
- Több cselekvő/szerep téves: pl. „alaptalanul meghozott ítélet” bosszúálló subjectként. A source offsets ettől még pontosak.
- Canonical írás: nincs. Ezek kutatási frame-hibák, nem production DB-módosítások.

## MORPH_CLAUSE_FINDINGS – nem javítottuk a first pass után

| ID | Súlyosság | Általánosítható | Valószínű ok / érintett modul | Állapot |
|---|---|---|---|---|
| MCB-F001 | HIGH | igen | `numericArgs`: külön szóban álló előjel elveszik; h24 | OPEN RESEARCH |
| MCB-F002 | HIGH | igen | `choose` + noun fallback: locative tulajdonos/helyszín → actor; h10 | OPEN RESEARCH |
| MCB-F003 | HIGH | igen | `bind` reporting-source jelöltje case-szűrés nélkül fogad címzettet; h20 | OPEN RESEARCH |
| MCB-F004 | HIGH | igen | Clause-n belüli előzményi/mellékmondati numeric ownership; #003 100% | OPEN RESEARCH |
| MCB-F005 | MEDIUM | igen | `segment`: idézet + utólagos reporting clause; h23 | OPEN RESEARCH |
| MCB-F006 | MEDIUM | igen | `fuseEntities`: hibás lemma/type, generikus intézményemlítés entityként, pronoun/mixed-boundary átcsúszás | OPEN RESEARCH |
| MCB-F007 | MEDIUM | igen | `bind`: ellipszis actiont/unitot ad át, modalitást nem; h21 | OPEN RESEARCH |
| MCB-F008 | MEDIUM | igen | `bind`: antecedens és nested attribution nincs feloldva; h12/h14/h17 | OPEN RESEARCH |
| MCB-F009 | MEDIUM | igen | `numericArgs` + referent: összehasonlítás, tarifa, count lexikon, termékazonosság részleges; h08/h16/h17 | OPEN RESEARCH |
| MCB-F010 | HIGH | igen | `bind`: morfológiai Mood=Cnd összemosódik logikai conditional scope-pal; #003 tagadott feltételes állítás | OPEN RESEARCH |
| MCB-F011 | MEDIUM | igen | `morph-evaluate`: matched-only részmutatók változó nevezője; dokumentált, evaluator immutable | OPEN MEASUREMENT |

## Biztonsági státuszok

| Gate | Eredmény | Bizonyíték / értelmezés |
|---|---|---|
| SEMANTIC ENTAILMENT SAFETY | FAIL | resolved, de téves actor/érték/forrás; nem teljes entailment checker |
| MULTI-SUBJECT NUMERIC SAFETY | FAIL | jó szintetikus javulás mellett h24 és #003 100% hibás |
| ENTITY BOUNDARY SAFETY | FAIL | #003 pronoun és szétvágott teljes név; típusfúzió is részleges |
| ATTRIBUTION SAFETY | FAIL | címzett→forrás h20; nested/idézet unresolved |
| CONDITIONAL SCOPE SAFETY | FAIL | invariáns PASS, de #003 Mood=Cnd és logikai feltételesség összemosása |
| EVIDENCE SAFETY | PASS | held-out E 189/189; #003 E 657/657 raw UTF-16 slice exact |

Az evidence PASS a koordinátákra vonatkozik. **Nem jelenti azt, hogy a pontosan idézett szöveget helyesen értelmezte a rendszer.**

## Worker, függőségek, license

- Perzisztens izolált WSL worker, HuSpaCy 0.12.1 / hu_core_news_md 3.8.0 / spaCy 3.8.16 / Python 3.12.3; modellfájlok hash-e: `07_model_environment.json`.
- Nincs dependency-head/label a worker kimenetében. A dependency mezők mesterséges megváltoztatása sem módosítja E-t.
- 200000 karakteres inputkorlát, 4 pending request, timeout, bounded output, JSON/offset validálás. A worker nincs az alkalmazás pipeline-jába bekötve.
- Offline hibainjektálás: crash, hang/timeout, malformed output, queue-full, out-of-order response, restart. Valós worker: malformed transport, crash és újraindulás; 6/6 sikeres ellenőrzés (`10_live_worker_safety.json`). A fallback a kísérleti callerben ténylegesen meghívható A, nem production-integráció bizonyítéka.
- A lokális pip targetben NumPy 2.5.3 van. A telepítő a globális scipy 1.11.4-gyel inkompatibilitást jelzett; a worker ezt nem importálja. Külön rögzített, tiszta környezet kellene egy későbbi csomagolt integrációhoz.
- A `source-map-js: 1.2.2` override és a package-lock változatlan. Production audit: 0. Teljes audit: 5 HIGH, a dev-only eslint-config-next → fast-glob/micromatch/braces ágban; nincs force-fix vagy Next downgrade.

A HuSpaCy library Apache-2.0; a modell licence CC BY-SA 4.0. A licenceket külön kell kezelni. [HuSpaCy LICENSE](https://github.com/huspacy/huspacy/blob/master/LICENSE), [modellkártya](https://huggingface.co/huspacy/hu_core_news_md).

A CC licenc alapján a terjesztett modellnél meg kell őrizni a szerzőségi/licencinformációt, és jelezni kell a módosításokat. A módosított modell megosztásakor a ShareAlike feltételeit is vizsgálni kell. A modellt tartalmazó átadott Docker-image vagy csomag terjesztésként kezelendő. Pusztán szerveren futó SaaS nem azonos modellcsomag átadásával; ebből önmagában nem következik az egész UTOM forrásának nyilvánossága. Az adapter/output/finomhangolt modell származékos jellegének megítélése külön kérdés. **Launch előtt attorney review szükséges; ez nem végleges jogi állásfoglalás.** [CC BY-SA 4.0 jogi szöveg](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en).

## Elvárások teljesítése és még hiányzó részek

| Elvárás | Státusz | Konkrét evidence / fennmaradó rész |
|---|---|---|
| Induló és végleges freeze; korábbi artefaktumok megőrzése | COMPLETE | 38 és 68 hash; immutable first-pass |
| Tényleges A, B, E összehasonlítás, D elkülönített referencia | COMPLETE | valódi jelenlegi semantic API; D módszertani korlát dokumentált |
| Dependency nem authoritative | COMPLETE | worker nem adja ki; poisoning regresszió |
| Proposition segmentation és ownership | PARTIAL | 47/48 határ; quote és clause-n belüli számtulajdonos hibás |
| Multi-subject numerikus kötés | PARTIAL | nagy javulás, de 3/31 resolved téves; nem production-safe |
| Ellipszis | PARTIAL | koordinált action/unit működik; modalitás, termék és attribúció öröklése hiányos |
| Identity / namesake | PARTIAL | full lemma+type kulcs; nincs vezetéknév-only merge; Júlia lemma hibás |
| Metadata/entity boundary/type fusion | PARTIAL | explicit fotósor és emoji teszt jó; ország/város/termék típus nincs teljesen, valós névhatár/type hibák |
| Forrásszerepek | PARTIAL | media/authority/court külön; egyéb reporting és névmások hiányosak |
| Beismerés/tagadás | PARTIAL | egy frozen példa 1/1; #003 visszautalás nem teljes |
| Feltétel/tagadás/modalitás | PARTIAL | invariáns és fejlesztési scope regresszió zöld, szemantikai feltételesség hibás |
| Numerikus jelentéstípusok | PARTIAL | pénz, százalék, pp, hőmérséklet, count, bound, comparison jelen van; nem teljes age/duration/speed/range/delta coverage |
| Candidate scoring / abstention | PARTIAL | determinisztikus routing confidence, tie abstains; kompatibilitás túl megengedő |
| Exact evidence és dedup | COMPLETE (mért scope) | 189/189 és 657/657; azonos kulcsú duplicate 0 |
| Kanonikus projection safety | N/A / DISABLED | Nincs DB/canonical producer; frame nem tényadatbázis |
| 13 téma és 12 strukturált mutation | COMPLETE | 20 dev + 12 mutation; 15 offline regression test |
| Új frozen held-out | COMPLETE (szintetikus) | 24 szöveg, 48 proposition; független emberi benchmark még kell |
| Layerenkénti mérés | PARTIAL | nyers számlálók megvannak; entailment proxy és matched-only részmutatók korlátai fent |
| #003 freeze utáni diagnosztika | COMPLETE | teljes kimenet + tévedések megőrizve, nem tuning-input |
| Worker safety | COMPLETE (research harness) | offline + 6 valós worker ellenőrzés; production nincs bekötve |
| Licencvizsgálat | COMPLETE (technikai előszűrés) | elsődleges források; jogi véglegesítés nincs |
| Runtime 100/500 | COMPLETE | 100: 143,12 s; 500: 687,83 s; három teljes átadott szöveg ismétlése, nem 600 külön cikk |

## Regresszió és quality gate

| Ellenőrzés | Eredmény |
|---|---|
| Új morphology/clause célzott teszt | 15/15 PASS |
| Offline suite | 505/505 PASS, 0 FAIL |
| HuSpaCy worker valódi hibainjektálás | 6/6 PASS |
| Cross-domain foundation / Round 2, REAL_WORLD_001 Round 1/2/2.1/2.2 | Az összes meglévő unit teszt a teljes offline suite-ban PASS |
| Core / Dense / frozen historical held-out | Mindhárom korábbi mérőszámkészlettel pontosan azonos; külön új fájlban, a régi nem változott |
| TypeScript | PASS (`npm run check`) |
| Helyi importok | PASS |
| Teljes ESLint | 0 error / 410 warning; nem jelentjük warning-free-nek |
| Production audit | 0 vulnerability |
| Full npm audit | 5 HIGH, dev-only lint függőségek; exit 1, NEM teljes audit PASS |
| `npm run check` | PASS, exit 0 |
| Production build | PASS, 75/75 oldal; deploy nem történt |
| Disposable MySQL 8.0.46 full wrapper | 20 tesztfájl, 60 teszt: 59 PASS / 0 FAIL / 1 SKIP |
| FFmpeg | Kizárólag hiányzó executable miatt environment SKIP |

**MYSQL 8 FULL GATE: PASS** – az egy FFmpeg-kivétel külön jelölve.

**PRODUCTION DEPENDENCY AUDIT: PASS**

A lokális `33307` porton a `/tmp/utom-r22` disposable datadir `utom_v22_r2_2_test` adatbázisát használta a wrapper. Az opt-in engedélyek és test-only titkosítási kulcs csak a tesztfolyamat környezetében voltak. Production URL-t nem használtunk. A saját MySQL folyamatot a wrapper sikeres befejezése után leállítottuk; más helyi MySQL példányokhoz nem nyúltunk.

A performance futás miatt az offline/SQL suite-tal részben párhuzamosan történt mérés nem izolált hardver-benchmark. A nyers eredmény megőrzi a tényleges latency/throughput/RSS értékeket; az előző 23 ms/cikk számhoz nem állítunk azonos terhelésű összevetést.

A kísérleti fájlokra alkalmazásból (`app`, `lib`, `components`, `hooks`) nincs import. Csak a kutatási scriptek és az új unit teszt fogyasztják őket. A routing confidence súlyozott nyelvi jelöltválasztási jel, nem igazságvalószínűség.

## Záró mérési csomag

- [Részletes runtime](RUNTIME_REPORT.md): 100 szöveg átlag 1431,23 ms; 500 szöveg átlag 1375,66 ms, P95 1811,24 ms; 0,727 szöveg/s. Worker peak RSS 595,3 MiB. Load 1045,2 ms; teljes #003 cold 5941,5 ms; restart és rövid próba 1444,8 ms.
- [Záró integritás](11_final_integrity.json): 38/38 kiinduló hash és 68/68 végleges freeze hash egyezik; tracked diff hash változatlan; élő remote HEAD is a kiinduló commit.
- [Új held-out mérés](03_heldout_evaluation.json), [A nyers](A_first_pass_raw.json), [B nyers](B_first_pass_raw.json), [E nyers](E_first_pass_raw.json).
- [Korábbi benchmarkregresszió](06_historical_regression.json): Core/Dense/historical held-out mérőszámok változatlanok; a korábbi fájlok megőrizve.
- A saját workerfolyamat normál leállítással véget ért; a saját disposable MySQL leállítva. A modell célkönyvtára megmaradt az ellenőrzés reprodukálhatóságához.

CURRENT POSITION: a befagyasztott kutatási mérés és az előírt ellenőrzések befejezve, a szemantikai megoldás PARTIAL. NEXT ACTION / RESUME FROM HERE: a tulajdonosi/műszaki review az MCB-F001–F011 findingekről döntsön; addig a `02_final_freeze.json` szerinti kód, gold és első A/B/E kimenet változatlan. Nincs automatikus production-integráció vagy további cikkre hangolás.

## Következő engedélyezendő kutatási kör

Előbb független mérési review és az MCB-F001–F011 prioritása. A mostani held-out marad történeti mérés: nem írható át, és következő fejlesztés után már nem nevezhető új vaktesztnek. Következő körben új, független szöveg/gold, valódi entailment és szerepkötési ellenőrzés szükséges. Ebben a sessionben a freeze utáni findingeket nem javítjuk. Production integráció, commit, push, deploy, fizetős AI és külső AI/provider-hívás: 0.
