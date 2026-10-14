# FRESH_BLIND findings — measurement only

No repair, new regression or production integration authorized/performed here.

## FB-01 — HIGH — Numeric dimensions, comparison and conditional scope

**Safety; generalizable.** Frozen wrong-resolved decisions: C2, C4, E4, J5, O2.

- C2: `meghaladhatja a 8 milliárd eurót` → resolved equal instead of lower bound.
  Possibility is retained but does not make equality correct.
- C4: `6 százalékkal bővült` → unqualified equal percentage, no relative change.
- E4: `Szélcsend esetén` is lost from the resolved 11-hour possible-duration scope.
- J5: `12 és 18 milliszekundum között` → resolved count 12, equal; range lost.
- O2: `kilónként 412 forint` → resolved 412 HUF, denominator kg lost.

Likely modules: `numeric-scope-safety.cjs`, `compound-rate-safety.cjs`, and
`dependency-binding.cjs` with upstream numeric recognition. This is a hypothesis
from observed output, not a completed code-root-cause investigation. Safe behavior
on known patterns does not establish safe fallback behavior on unknown ones.

## FB-02 — HIGH — Document/nominal head promoted to attribution identity

**Safety; generalizable.** O1: `Az üzletlánc árjegyzéke szerint` resolves source
`árjegyzéke`, backed by `sourceEvidence.resolutionStatus=resolved`. Under the frozen
source-entity contract, the store chain is source and its price list is evidence.

C02 succeeds on C1/E1/S1 possessive nominals, but does not cover this document noun.
Likely modules: `source-composition-safety.cjs` and `dependency-binding.cjs` source
fallback. The event-nominal shape gate is a likely boundary, not a proven full fix.

## FB-03 — MEDIUM — Conservative recall and compositional coverage

**Recall; generalizable.** 61 missed defensible decisions, especially reporting
verbs/nominals, explicit institutional actors, rank ownership, relative clauses,
and complex correction scope. Examples: A2/G3/P1 missing source links; F1 loses
original source layer; B1/H1/R1 actors missing; I2/I3 rank missing; B4/L3/Q4/S4
correction unresolved. The positive tests and 13 correct abstentions do not close
these coverage gaps.

Likely modules: `source-scope-recovery.cjs`, `source-composition-safety.cjs`,
`dependency-binding.cjs`, contrast binding and temporal/rank recognition in the
research chain. Do not repair by unconditional fallback or by fitting this corpus.

## Interpretation boundary

Research slots can be explicitly resolved inside an unresolved overall frame.
We audit these slots because they are the requested research contract. Canonical
projection remains OFF; these observations are not claims of production writes.
