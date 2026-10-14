# BEFORE_REPAIR — blind readiness audit

2026-10-09 · develop/utom-recovery · research only

## Döntés

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO**

Egy súlyos, általánosítható WRONG_RESOLVED egységvesztés és több nyilvánvaló
kihagyás látható. Az elliptikus rank PARTIAL önmagában nem indokolja a NO-t:
ezen a mintán rangsorhely kapcsán konzervatív recall-hiány volt, nem tévesen
pozitív rank. A readiness-t a mért hibák indokolják.

## Mi volt vak és mi nem?

7 új magyar hírszöveg-jellegű **szintetikus** research snippet, 15 mondat:
politika, gazdaság, rendőrségi hír, sport, időjárás, technológia, egészségügy.
Nem valódi publikált hírcikkek, és nem emberi külső annotátor vaktesztje.
A korpusz létrehozója és az auditáló ugyanaz az asszisztens; az előző munkát
ismerte. A korpusz nem került a binderhez tanításként vagy szabályként.
Ez friss holdout readiness-probe, nem populációs teljesítménybecslés.

A repositoryban azonosított 001/002/003 raw cikkek és korábbi heldout állományok
kutatási felhasználása már ismert, így nem volt igazolható érintetlen státuszuk.
Ezeket nem használtuk új blind mintaként. Internetes kiegészítés nem történt.

A freeze.json még a corpus létrehozása előtt rögzítette a branchet, HEAD-et,
git statust, tracked diff hash-t és 118 releváns kód/teszt SHA-256-át.
Az expected.json 39 szemantikai elvárása az első futás ELŐTT készült, a corpus
és az expected hash-e az input_manifest.json-ban. A binder kizárólag nyers
szöveget és a helyi HuSpaCy annotációját kapta; az expectedet nem olvasta.

Az egyetlen first-pass a BEFORE_REPAIR_raw.json, kizárólagos létrehozással
mentve, nem felülírva. A címkék utána készültek. Javítás és második inference
nem történt. verification.json igazolja: 0 megváltozott lefagyasztott fájl,
0 megváltozott input, raw output SHA-256 megőrizve. Canonical projection OFF.

## Metrikák — a rögzített 39 itemen

| Metrika | Eredmény |
|---|---:|
| Total evaluated semantic decisions | 39 |
| CORRECT_RESOLVED | 25 |
| WRONG_RESOLVED | **1** |
| CORRECT_UNRESOLVED | 2 |
| MISSED_DEFENSIBLE_RESOLUTION | 11 |
| NOT_APPLICABLE a kiválasztott itemek között | 0 |
| Resolved precision | 25/26 = 96,15% |
| Resolution rate | 26/39 = 66,67% |
| Correct-resolution coverage | 25/39 = 64,10% |
| WRONG_RESOLVED_RATE a resolved döntéseken | **1/26 = 3,85%** |
| Wrong resolved / összes értékelt item | 1/39 = 2,56% |
| Helyes döntés, abstentionnel együtt | 27/39 = 69,23% |
| Exact evidence offset | 299/299 = 100%; 0 failure |

Az offset-szám előfordulásokat számol, nem unique spanokat. A W3 hibás
measurement evidence-e is pontosan szeletelhető, mégsem támasztja alá a
kivetített szemantikai értelmezést. A span accuracy nem entailment accuracy.

| Dimenzió | Helyes döntés / item (CR+CU) | Resolved precision |
|---|---:|---:|
| Actor | 5/8 = 62,50% | 3/3 |
| Attribution | 3/5 = 60,00% | 3/3 |
| Numeric semantics | 7/12 = 58,33% | 7/8 |
| Temporal | 5/6 = 83,33% | 5/5 |
| Contrast/negation | 3/4 = 75,00% | 3/3 |
| Entity boundary | 4/4 = 100% | 4/4 |

A numeric kategóriában rank/ordinal is szerepel; a temporal kategória külön
year/date/clock/duration/boundary. Egy item csak egy fő kategóriát kapott.
Az output ismételt actor/syntacticRoles/evidence mezői nem új gold itemek.
Ez nem minden elképzelhető szövegtény teljes recall-felmérése.

## Failure taxonomy — legfeljebb három következő blokk

### B01 — Összetett mértékegység és szerep elvesztése (HIGH)

W3: `60 kilométert óránként` → `value=60, unit=km, semanticKind=measurement,
binding=resolved`, a sebesség és küszöb helyett. Az óránként nevező kimarad.
Pozitív strukturális út van, de nem elég a semantic kind/unit igazolásához.
Valószínű érintett: dependency-binding.cjs unit/head route és property typing.
Egy előfordulás nem gyakorisági bizonyíték, de általánosítható safety rés.
**Ez az első következő blocker. Ebben az auditban nem javítottuk.**

### B02 — Forrásvesztés és idézet utáni mondat kihagyása (HIGH recall)

P6: tagadás polarity megmarad, szóvivő forrása elveszik.
H1: az igazgató quote-speaker nincs reprezentálva.
H4: az idézet utáni október 17-i boundary mondat teljesen kiesik.
Valószínű root: reporting/quote segmentation és frame recovery/ownership.
Érintett kutatási rétegek: role-scope / real-text-a / attribution binder.
Nem bizonyítunk source→actor összeomlást: itt hiányok vannak.

### B03 — Indokolatlan abstention egyszerű argumentumoknál (MEDIUM recall)

A2/A5/H2 explicit generic actorok kihagyva; S1/S2/T3 ordinal/rank feloldás
elmarad; E4/E5 támogatási correction nem reprezentált. Valószínű root:
szűk szemantikai actor-engedélyezés, parser-él eltérés, túl szűk parallel
alternative grammar (mértékegység utáni property-főnév).
Érintett: dependency / temporal / contrast research rétegek.
Az unresolved többsége itt nem valós szövegbeli kétértelműség: 11 kihagyás
szemben 2 indokolt abstentionnel. Nem elfogadható READY indokként, hogy
minden bizonytalan output automatikusan biztonságosnak nevezhető.

## Scope és további megfigyelések

Publisher nem lett kitalálva; P nested chain külön outer/intermediate owner.
Denial és conditional consequence megmaradt. Rejected pozitív értékszivárgást
nem találtunk, de a gazdasági correction strukturált rejected/accepted párja
hiányzik. Az elliptikus rank ezen a mintán recall-hiány, nem safety blocker
önmagában. Entity névspanok a vizsgált itemekben külön maradtak.

A corpus nem bizonyít recipient attachmentet, valódi namesake disambiguationt,
person-vs-location névütközést, minden title/role vagy többszintű quote típust.
Ezek ezen a mintán N/A / NOT EXERCISED, nem PASS. W6 birtokstruktúrát vizsgált,
de nem helyettesíti egy személy-birtokos aktor-tévesztés teljes vizsgálatát.

Output-inventory megjegyzés: T második mondatában az `első mérés` ordinal is
unresolved; ez további, előre nem kiválasztott recall-hiány, a 39-es nevezőt
utólag nem növeltük. P-ben a március→6-án syntactic possessor címke megjelenik:
grammatikai nmod/possessive jelzésként értékeltük, nem önálló tulajdonlási
claimként; ennek downstream szemantikai felhasználása nincs igazolva.

## Validáció és artefaktumok

Az összes jelenlegi `tests/unit/v22-*.test.cjs`: **243/243 PASS, 0 FAIL**.
Új audit-tesztet nem adtunk a suite-hoz, bindert nem javítottunk.
Nincs production change, fizetős agent call, build/preflight, full project suite,
commit, push vagy deploy.

- freeze.json — állapot és hash manifest
- corpus.json / expected.json / input_manifest.json — futás előtti bemenetek
- BEFORE_REPAIR_raw.json — eredeti annotáció + teljes output
- labels.json / human_item_audit.md — minden kiválasztott item és indok
- metrics.json — számolt metrikák és dimenziók
- targeted-tests.txt / verification.json — suite és változatlanság bizonyítéka

Az eredmény tulajdonosi/műszaki felülvizsgálatra kész. Következő fejlesztésnek
a **B01 összetett mértékegység + semantic-role biztonsági kaput** javasoljuk;
az audit alapján további kódmódosítás nem történt.
