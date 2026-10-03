# M11 – Conflict és confidence history

## Cél és határ

Az M11 az M8 kanonikus claimjeiből determinisztikusan konfliktusjelölteket képez, az M9/M10 által megőrzött entity- és időbeli kontextust felhasználva. A jelölt mindkét megfigyelést, bizonyíték- és attribution-hivatkozást megőrzi; a rendszer nem választ automatikus igazságot vagy forrásgyőztest. A confidence history append-only és auditálható, de a confidence nem truth probability.

Input: két validált, canonical claim (`subjectEntityId`, `predicate`, `claimType`, value/normalizedValue, optional unit, validity interval, evidence és attribution).

Output: `candidate`, `no_conflict`, `no_match` vagy validációs hiba; candidate esetén deterministic, order-insensitive fingerprint és `state: open`.

Persistence: `v2_conflicts`, `v2_confidence_history` és az idempotencia auditjához `v2_entity_graph_history`. A repository nem commitol és nem rollbackel; ezt a caller tranzakciója végzi.

## Acceptance matrix

| ID | Követelmény | Státusz | Bizonyíték |
|---|---|---|---|
| M11-01 | Canonical claim validáció | COMPLETE | `lib/v2/conflict-history.js`, unit |
| M11-02 | Bounded subject/predicate/type candidate comparison | COMPLETE | deterministic detector unit |
| M11-03 | Numeric same/different value and unit mismatch | COMPLETE | `v2-conflict-history.test.cjs` |
| M11-04 | Boolean/categorical contradiction | COMPLETE | `v2-conflict-history.test.cjs` |
| M11-05 | Temporal overlap, disjoint and unknown scope | COMPLETE | detector interval tests |
| M11-06 | Attribution and evidence preservation | COMPLETE | candidate payload test |
| M11-07 | Symmetric fingerprint and retry identity | COMPLETE | A/B symmetry and repository contract |
| M11-08 | Open conflict persistence without winner | COMPLETE | repository unit; MySQL integration when enabled |
| M11-09 | Append-only confidence history with reason/version/evidence delta | COMPLETE | repository unit; MySQL integration when enabled |
| M11-10 | No automatic winner or source precedence | COMPLETE | `automaticWinner: null`, open state |
| M11-11 | Caller transaction, rollback and concurrency-safe unique identity | COMPLETE | repository SQL contract; MySQL integration when enabled |
| M11-12 | Feature OFF/ON behavior, zero side effects when OFF | COMPLETE | runtime unit |
| M11-13 | Free-text semantic contradiction | N/A | explicit semantic AI comparison is outside this deterministic slice |
| M11-14 | Source trust weighting / winner policy | N/A | Q08 remains deferrable; no authority is invented |

## Technical notes

- Different valid intervals are not conflicts when they are disjoint; unknown intervals remain explicit and require review.
- Numeric values with different units are not compared without an approved conversion policy.
- `v2_entity_graph_history.operation_key` is used as the idempotency fence because the existing confidence table is intentionally append-only and has no overwrite key.
- Feature-off runtime performs zero reads, writes and provider calls.
- No migration is required: migrations 046–048 already represent the M11 persistence contract and schema remains 058.

## Validation

- M11 unit regression: 5/5 PASS.
- Repository/import contract: PASS.
- MySQL integration suite: 4/4 PASS on isolated MySQL 8.0.46; it covers persistence retry, confidence retry, caller rollback and concurrent workers.
- No paid AI/provider call is used.

## Findings

- **M11-F001 – MySQL upsert affected-row ambiguity**: `ON DUPLICATE KEY UPDATE` affected-row semantics were not stable enough to identify a retry with the configured mysql2 client. The repository now uses duplicate-safe insert plus deterministic identity readback; targeted integration reproduced the retry and concurrent-worker cases before and after the fix. **FIXED**.

## Status

`M11 IMPLEMENTATION: COMPLETE`

`M11 COMPLETE: YES`

`M11 IMPLEMENTATION BLOCKER: NONE`

`M11 BLOCKING OWNER QUESTIONS: 0`
