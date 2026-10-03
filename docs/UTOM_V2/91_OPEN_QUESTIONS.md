# Open Questions

M1-D01–M1-D05 are resolved owner decisions recorded in `90_DECISIONS.md`. They remain in this register for traceability and are no longer open blockers. The resulting M1.1 contract freeze is complete and canonical in `M11_CONTRACT_FREEZE.md`; Q06–Q14 remain deferred to their listed milestones.

| ID | Question | Why it matters | Options | Recommendation | Needed before | Deferrable | Status |
|---|---|---|---|---|---|---|---|
| Q01 / M1-D01 | V2 source pack approval | product authority | add docs / approve package / defer | approve docs before M1 | M1 | no | RESOLVED – OPTION A, owner-approved 2026-10-02 |
| Q02 / M1-D02 | entity taxonomy | schema/API stability | fixed first set / extensible / free text | fixed controlled vocabulary first | M1 | no | RESOLVED – OPTION A, owner-approved 2026-10-02 |
| Q03 / M1-D03 | legacy compatibility and migration policy | current behavior safety | additive / parallel / replacement | additive only | M1 | no | RESOLVED – OPTION A, owner-approved 2026-10-02 |
| Q04 / M1-D04 | temporal storage and timezone baseline | temporal correctness | UTC / Budapest / mixed | UTC storage, explicit Budapest presentation | M1 | no | RESOLVED – OPTION A, owner-approved 2026-10-02 |
| Q05 / M1-D05 | AI diagnostic retention boundary | privacy and storage | metadata/redacted / encrypted raw / plaintext raw | metadata plus redacted reference | M1 | no | RESOLVED – OPTION A, owner-approved 2026-10-02 |
| Q06 | confidence thresholds | merge safety | conservative / broad | conservative + review | M5 | no | RESOLVED – precision-first: auto >= 0.95, review 0.80–0.9499, unresolved below 0.80; ambiguity always wins, owner-approved 2026-10-03 |
| Q07 | event merge authority | history correctness | automatic / review | automatic candidate, review merge | M9 | no | OPEN |
| Q08 | source trust weighting | conflict display | none / weighted | no hidden winner; explicit evidence | M11 | yes | OPEN |
| Q09 | AI provider and budget | cost/legal | provider choices | mock by default, cap cost | M12 | no | OPEN |
| Q10 | manual review roles | operations | admin/reviewer | explicit role matrix | M5 | yes | OPEN |
| Q11 | payment and billing | entitlement | provider choices | keep actions disabled | M16 | no | OPEN |
| Q12 | separate reporting database | scale and isolation | same MySQL / reporting replica | measure read-model load first | M13/M17 | yes | OPEN |
| Q13 | graph database | scale | MySQL / separate graph | measure before adding | M13 | yes | OPEN |
| Q14 | timeline business-day presentation policy | temporal correctness | UTC / Budapest / user locale | UTC storage, explicit display policy | M10/M13 | yes | OPEN |

Every unresolved question requires owner, decision date and recorded rationale before its blocking milestone. The five M1 decisions already have that record.
