# Elliptikus rank / placement – research checkpoint

2026-10-09 · develop/utom-recovery · canonical projection OFF

## Gyökérok

A korábbi temporal layer ordinal → hely → predicate útból állapított meg ranket.
Kopulás állítmánynál a HuSpaCy az ordinalt teszi meg állítmányi fejnek; a subject
ehhez, a copula ugyancsak ehhez kapcsolódik. Ez a szerkezet nem kapott ranket.
Az explicit rank ownerje ráadásul korábban az ordinal token volt, nem a rangsorolt
alany. A névszói ordinal tulajdonosa most a módosított főnév.

## Általános szabály és határ

Elliptikus rank: morfológiailag Ord + nominativusi predikatív fej + lokális
eredménykopula (`lesz`) + egyetlen explicit nsubj + PER/ORG szemantikai evidencia.
A subject nem viselhet forrás/címzett case markert; koordináció mellett abstain.
A morfológiai jel és kopula nem elég önmagában. Az értékdekódolás újrahasználja
a meglévő ordinalValue függvényt; a számszó-listát nem bővítettük, az nem a rank
döntési feltétele. Nincs névhez vagy fixture-mondathoz kötött implementáció.

Explicit rank megtartja a hely + governing predicate bizonyítékát és külön
subject-kötést kap. A helyre + lép + előre dependency/preverb kombináció szintén
támogatott. Nincs automatikus rangsor a forduló/alkalom/nap/kerület módosítójából.

Rank evidence: raw span, numeric ordinal value, semanticKind=rank, owner,
frameId, copula/predicate és subject dependency utak, rule. Külön rule az
elliptikus és explicit szerkezet. A subject bizonyítása itt a rank ownerét
oldja fel, nem kényszeríti automatikusan resolvedra a külön event actor mezőt.

Contrast rank a meglévő rejected/accepted modellben marad. Az accepted ordinal
saját copulájához tartozó, parallel-alternative subject kapcsolat szükséges.
Implicit subjectnél az alternatívák megmaradnak, de a pozitív rank unresolved.
Attribution source nem válik rangsorolt subjectté.

## Reprodukció, regresszió és evidence

16 új mondat valódi helyi HuSpaCy-annotációja a rank-annotations.json-ban.
18 új teszt: két explicit elliptikus eredmény, explicit placement és előrelépés,
négy ordinal negatív kontroll, ordinal+rank, attributed több személy, hibás
parser-subject miatti abstention, contrast explicit/implicit ownerrel,
ambiguous és coordination, több numerikus osztály, külön subject/copula/NER
mutáció, pontos evidence. A mutációk kontrollált negatív tesztek.

A `szövetség szerint …` mintában a parser a személyt nmod:att-nak jelölte:
rank unresolved, source megmaradt. A `Bálint szerint Eszter ötödik lett`
mintában valódi nsubj van: source Bálint, ranked entity Eszter. A többnumerikus
mintában a parser az alanyt az évhez kapcsolta; itt nem találunk ki subjectet.

Minden `tests/unit/v22-*.test.cjs`: **243/243 PASS, 0 FAIL, 0 SKIP**.
A korábbi 225 teszt változtatás nélkül megmaradt. A kimenetek és fixture hash a
08_rank_results.json-ban, exact evidence-ellenőrzéssel.

Nem futott full project suite, production build/preflight, fizetős agenthálózat.
Production, commit, push, deploy nem történt.

## Fájlok

- scripts/experimental/temporal-binding.cjs
- scripts/experimental/contrast-correction.cjs
- scripts/experimental/dependency-binding.cjs
- tests/fixtures/real-text-a/rank-annotations.json
- tests/unit/v22-elliptic-rank.test.cjs
- docs/UTOM_V2_2/real_text_round_a/08_rank_results.json
- ez a checkpoint

## Státusz

EXPLICIT RANK: PASS a tesztelt szerkezeteken.
ELLIPTIC RANK: PARTIAL — typed explicit subject + bizonyított graph működik;
implicit/generic subject és hibás parser-edge esetén abstention.
ORDINAL/RANK SEPARATION: PASS a célzott negatív kontrollokon.
ORDINAL/RANK összesen: PARTIAL.

A korábbi `A versenyző harmadik lett` generic-subject baseline továbbra is
unresolved. Nem jelentjük teljes osztály-lefedettségnek a named-subject sikert.
PER/ORG evidencia sem általános semantic entailment bizonyíték: tágabb
sorrend/rangsor discourse-különbség és parserhiba nincs univerzálisan megoldva.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

Következő blocker: generic/implicit rangsorolt subject szemantikai bizonyítéka
és a predikatív sorrend vs tényleges eredmény-rangsor elkülönítése. Ne javítsuk
kézzel a parserhibás fixture-ök dependency-éleit pozitív eredmény kedvéért.
