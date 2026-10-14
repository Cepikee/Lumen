# Félbeszakadt API candidate – helyi szemantikai felülvizsgálat

2026-10-09 · develop/utom-recovery · research only · canonical projection OFF

## Provenance / döntés

Legutóbbi run: `scripts/agents/runs/2026-10-08T22-56-35-496Z`.
Elolvasva az implementer report, blind benchmark és tests eredmény; ellenőrizve
a run-start-backup és backup állományai. FINAL.md és rejected-run-state nincs.
Az implementer 193/193 PASS-t jelentett; ezt a jelenlegi munkafán függetlenül
újrafuttatott V2.2 célzott tesztkészlet is igazolta. Judge ACCEPT/REJECT nincs;
a credit-hiba okát a felhasználói kontextus közli, külön Judge-eredményként nem
kezeljük. Fizetős agenthálózat nem indult.

A run-start-backuphoz képest a candidate három fájlt érintett:
dependency-binding.cjs, dependency-extra-annotations.json és
v22-dependency-binding.test.cjs. A diff érdemben actor licensing, generic count,
hét/nap/óra duration és percentage subtype fejlesztés. A korábbi research
rétegek és a tracked lib/v2, lib/v22, package, integration, baseline diffek
már meglévő munkák; nem rollbackeltük vagy módosítottuk őket ebben a körben.
AGENTS.md, CLAUDE.md, docs.zip érintetlen. Globális restore/reset nem történt.

Döntés: candidate hasznos részei MEGTARTVA, konkrét hibái célzottan javítva.
Ez helyi auditdöntés, nem utólag kitalált Independent Judge ACCEPT.

## Reprodukálható hibák és javítás

1. `A vállalat épülete összeomlott.`: az épület actor lett, mert minden
   Person[psor] morfológia actor-engedély volt. A birtokosság többé nem
   szemantikai actor-bizonyíték. NER vagy pozitív actor-főnévosztály szükséges,
   a subject/case/scope ellenőrzésekkel együtt. Nincs -i suffix hack vagy
   proper-name-specifikus feltétel. A pozitív lexikai osztály szándékosan szűk;
   ismeretlen foglalkozások/szervezetek továbbra is unresolved lehetnek.
2. `Az intézet 17 új mikroszkópot vásárolt.`: a COUNT elveszett a közbeékelt
   melléknév miatt. Most NUM → counted noun dependency alapján találjuk meg a
   főnevet. Nincs count-főnév whitelist.
3. `A műhely nem 12, hanem 18 csavart rendelt.`: a generikus correction COUNT
   nem működött. A correction grammar elfogad generikus numerált főnevet,
   de a dependency layer külön bizonyítja az accepted szám útját. Önmagában
   a parallel-alternative marker többé nem elég. A 12 rejected marad.
4. A korábbi correction output a dependencyből leválasztott accepted számot
   is resolvedként őrizte. Annotációmutációval reprodukálva és javítva:
   pozitív saját út nélkül unresolved, nincs owner vagy bindingEvidence.
5. A nested chain pusztán a korábbi felszíni parse alapján resolved maradt
   hibás szerint-governor mellett is. A dependency layer ellenőrzi a source NP,
   reporter/citation/according marker és proposition scope kapcsolatát.
   Hibás láncnál claimOwner/source unresolved, független numeric él megmarad.

A percentage továbbra is percentage és unit %, külön change_magnitude
propertyvel. Nem minden nem-change százalékot nevezünk automatikusan share-nek.
A candidate duration/year/headcount szeparációja megmaradt. Az unresolved
numeric nem törli a külön igazolt actort/source-láncot.

## Lefedettség és validáció

Meglévő candidate tesztek: -i modifieres organization actor, ambiguous subject,
organization possessor + role head, year/count collision, hét/nap/óra duration,
percentage subtype, nested chain, részleges frame megőrzés. Ezekhez ebben a
körben öt új regressziós teszt került a meglévő dependency tesztfájlba.

Új fixture: öt frissen, helyi HuSpaCy workerrel annotált általánosított mondat;
nem a Judge mondatai. A hibás attachment tesztek ezek/már meglévő annotációk
kifejezetten jelölt mutációi, nem valódi parserkimenetnek feltüntetett adatok.
Minden új fixture output evidence slice-a ellenőrizve; canonical output üres.

Végső parancs: `Get-ChildItem tests/unit/v22-*.test.cjs -File | Sort-Object Name`
által felsorolt összes fájl átadva a `node --test`-nek.

**198/198 PASS, 0 FAIL, 0 SKIP.** Baseline ebben a sessionben: 193/193 PASS.
Teljes projekt-suite, check, build, preflight, MySQL és deploy nem futott.
Commit/push nem történt.

## Ebben a körben módosított/új fájlok

- scripts/experimental/dependency-binding.cjs
- scripts/experimental/contrast-correction.cjs
- tests/unit/v22-dependency-binding.test.cjs
- tests/fixtures/real-text-a/candidate-review-annotations.json
- docs/UTOM_V2_2/real_text_round_a/06_interrupted_candidate_review.md

## Kutatási korlátok

ACTOR ROLE / ATTRIBUTION SOURCE / NUMERIC OWNERSHIP: PARTIAL.
LOGICAL / CONDITIONAL SCOPE / ENTITY BOUNDARY: PARTIAL.
EVIDENCE: PASS az új és célzott fixture-ökön.
SEMANTIC ENTAILMENT: NOT YET VERIFIED.

A szemantikai actor-osztály szűk; NER/parser tévedhet. Összetett calendar date,
ordinal/rank, óra szerinti határidő vs időtartam, többmondatos coreference és
teljes source-scope entailment nincs bizonyítva. A tesztek zöld eredménye nem
jelenti, hogy általánosan kizárt minden WRONG_RESOLVED eset. A korábbi blind
benchmark most ismert auditanyag, nem új független vakteszt.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

Következő konkrét kutatási blocker: temporal numeric szerepek (calendar date,
óra-határidő vs duration, ordinal/rank) strukturális és szemantikai elkülönítése.
