# Dependency-backed actor és numeric binding — research checkpoint

2026-10-08 · develop/utom-recovery · canonical projection OFF

## Scope és eredmény

Kizárólag a research binder dependency-bizonyítékkal történő argumentumkötése.
12 kért mondat + 4 kompatibilitási + 3 ambiguous contrast valódi HuSpaCy annotáció. Nem production
integráció, nem új vakteszt, nem általános semantic entailment bizonyítás.

## Reprodukció és root cause

A worker korábban morfológiát és tokenhatárokat adott át, de dependency relationt
és head-hivatkozást nem. A binder ezért nominativus/pozíció és helyi typed
numeric heurisztikára támaszkodott. A birtokos, címzett és attributáló forrás
elkülönítéséhez ez nem elég. A D mondat valódi parserkimenete a `Kovács Péter
számára` címzettet nsubj-nak jelöli; önmagában egy dependency címke sem elég.

Az új réteg kezdetben elvesztette Annát a `Nem Péter, hanem Anna írta alá…`
mondatban: a valódi elemzés Anna → conj → Péter → nsubj → ír éleket ad.
Ezt kizárólag bizonyított actor correction esetén fogadjuk el. Péter rejected
marad, a cselekvés továbbra is asserted.

A second pass során a `Nem Péter, hanem 35 embert bocsát el.` hibás scope-ban
a dependency réteg újra resolvedra állította a 35 mennyiséget. A két akciós
contrastban ugyanez actorokkal történt. Reprodukció után javítva: az unresolved
contrast-scope végleges tiltás az új réteg számára, nem írható felül helyi éllel.

## Implementáció

- A worker valódi `dep` és abszolút UTF-16 `headStart` mezőket exportál.
- A fő research belépési pont a morphology/contrast/attribution réteg UTÁN
  ellenőrzi a dependency kötéseket. Hiányzó dependency esetén nincs resolved
  actor/numeric binding; a régi output csak önálló komponensdiagnosztikában él.
- Egyetlen explicit nominativusi nsubj lehet actor. A possessive, recipient,
  attribution-source, object, passive patient és agent külön syntacticRoles.
  Több subject, koordináció vagy implicit subject esetén nincs kitalált actor.
- A számára/részére/szerint névutó és passive morphology felülírja a hibásan
  actorra utaló subject címkét. A particle + predicate visszaadja az aláír akciót.
- Age: number → éves → bizonyított személy vagy általános személyfőnév.
  A named referent önmagában nem bizonyított személy. Ismert duration-főnevek
  nem válnak életkor-tulajdonossá.
- Money/count: number/unit/property/predicate dependency út; a bevétel vagy
  támogatás összege nem a vállalat birtokosának személyes pénzösszege.
- Year temporal argument; duration és instrumentalis percentage change
  magnitude külön szerep. Nem a legközelebbi entity lesz owner.
- Resolved binding: sourceSpan, targetSpan, dependencyPath vagy explicit
  correction syntacticReason, frameId, semanticRole, resolutionStatus, rule.
- Rejected correction candidate kizárt. A nested attribution chain megmarad.
  A correction mellett jelen levő további numeric argumentumok nem vesznek el.

## Fájlok ebben a körben

- scripts/experimental/morph-worker.py
- scripts/experimental/dependency-binding.cjs (új)
- scripts/experimental/real-text-a-binder.cjs
- tests/fixtures/real-text-a/dependency-annotations.json (új, valódi worker)
- tests/fixtures/real-text-a/dependency-compatibility-annotations.json (új, valódi worker)
- tests/fixtures/real-text-a/dependency-ambiguous-annotations.json (új, valódi worker)
- tests/unit/v22-dependency-binding.test.cjs (új, 11 teszt)
- tests/unit/v22-real-text-a-research.test.cjs
- tests/unit/v22-contrast-correction.test.cjs
- tests/unit/v22-attribution-chain.test.cjs
- docs/UTOM_V2_2/real_text_round_a/05_dependency_results.json
- ez a checkpoint

A három régebbi tesztfájl most explicit a bindMorphologyStage komponensre
hivatkozik: történelmi fixture-jeikben nincs dependency. Ez NEM bizonyítja a
teljes új entrypoint régi korpuszon való működését. Az új dependency teszt a
fő bind entrypointot hívja; külön bizonyítja a missing-dependency abstentiont,
a correction és nested attribution együttműködést friss annotációkon.

## Validáció

Csak hét közvetlen research tesztfájl futott:

`node --test tests/unit/v22-dependency-binding.test.cjs tests/unit/v22-attribution-chain.test.cjs tests/unit/v22-contrast-correction.test.cjs tests/unit/v22-real-text-a-research.test.cjs tests/unit/v22-role-scope-research.test.cjs tests/unit/v22-role-scope-evaluator.test.cjs tests/unit/v22-morph-clause-research.test.cjs`

115/115 PASS: 11 új dependency teszt + 104 korábbi komponensregresszió.
Az új tesztek lefedik A–L példákat, ambiguous subjectet, disconnected numerict,
passive subjectet, hibás/hiányzó graphot, person evidence hiányát, correctiont,
nested source chain-t és nyers evidence offseteket. A negatív graph/morphology
tesztek kontrollált annotációmutációk; nem állítjuk, hogy ilyen kimenetet adott
a HuSpaCy az eredeti mondatokra.

19 valódi annotációhoz a megőrzött eredményben az evidence.spans számolja az
evidence-span előfordulásokat; 0 failure (ismétlődő spanokkal, nem unique szám).
Ezek mechanikai offsetek, nem teljes semantic entailment.

Nem futott teljes offline/unit suite, check, build, preflight vagy MySQL.
Productionhoz, RSS/auth/paymenthez nem nyúltunk. Commit/push/deploy nem történt.
A már korábban módosított production/V2.2 fájlok nem ennek a körnek a változásai.

## Korlátok és státusz

- A dependency modell tévedhet; a pozitív út nem általános entailment bizonyíték.
- Összetett dátumok, ordinal/rank, széles measurement/unit szókészlet,
  koordinált numeric tulajdonosok és implicit/coreferential személyek nem lezártak.
- Hiányzó dependency esetén a fő binder konzervatívan unresolved.
- A régi teljes development korpuszt nem annotáltuk újra; a 104 régebbi teszt
  komponensszintű bizonyíték, nem az új binding teljes korpusz-lefedettsége.

DEPENDENCY-BACKED ACTOR BINDING: PASS a definiált A–F és negatív tesztscope-ban

DEPENDENCY-BACKED NUMERIC BINDING: PARTIAL (G–L PASS; teljes típuslefedettség nincs)

ACTOR ROLE: PARTIAL globálisan

ATTRIBUTION SOURCE: PARTIAL globálisan

NUMERIC OWNERSHIP: PARTIAL

LOGICAL / CONDITIONAL SCOPE: PARTIAL

ENTITY BOUNDARY: PARTIAL

EVIDENCE: PASS a célzott fixture-ökön

SEMANTIC ENTAILMENT: NOT YET VERIFIED

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

## NEXT ACTION

Egyetlen következő blocker: a numeric dependency binding még nem lefedett
date/ordinal/measurement szerepei és kétértelmű unit/head kapcsolatai.
Ezekhez új, valódi HuSpaCy annotációs negatív/pozitív research regresszió kell;
ez a kör nem kezdi el a következő blockert.
