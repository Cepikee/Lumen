# V2.2 Benchmark dataset

A dataset 20 saját készítésű magyar hírszituációt és összesen 45 forrásváltozatot tartalmaz. Minden változat kontrollált, generált szöveg, 521–532 szó között; valódi újságcikk teljes szövege nincs benne.

| ID | Kategória | Források |
|---|---|---:|
| V22-S01 | numeric disagreement | 3 |
| V22-S02 | same number, different semantic meaning | 2 |
| V22-S03 | percentage disagreement | 3 |
| V22-S04 | unit conversion | 2 |
| V22-S05 | date/time disagreement | 2 |
| V22-S06 | plan vs completed event | 2 |
| V22-S07 | conditional future statement | 2 |
| V22-S08 | direct denial | 2 |
| V22-S09 | partial denial | 2 |
| V22-S10 | uncertain claim | 2 |
| V22-S11 | anonymous attribution | 2 |
| V22-S12 | official attribution | 2 |
| V22-S13 | quote vs journalist statement | 2 |
| V22-S14 | entity namesake | 2 |
| V22-S15 | entity type ambiguity | 2 |
| V22-S16 | changed plan over time | 3 |
| V22-S17 | source omission | 3 |
| V22-S18 | common fact + source-specific detail | 2 |
| V22-S19 | corrected information | 2 |
| V22-S20 | multi-event article | 3 |

Minden claim-megfigyeléshez tartozik source, evidence span, érték, opcionális unit, attribution, modality, polarity, uncertainty, conditionalitás, temporal scope, scope és event binding. Az expected objektumok az `expected` mezőben vannak; ezek nem kerülnek adatbázisba.

Regenerálás:

```text
node scripts/generate-v22-benchmark.cjs
```

## Dense coverage tier

A core suite mellett 5 külön dense scenario készült, mindegyik 3 forrással, 720–733 szó/forrás terjedelemmel, 4 entityvel és 8 claim-observationnel forrásonként. A dense expected állapot külön `denseScenarios` ágban szerepel; a core scenario-k változatlanok maradnak.
