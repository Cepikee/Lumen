# M10 – Temporal graph

## Exact scope

M10 provides an as-of temporal projection over the existing V2 timeline schema. It validates UTC temporal values, excludes future and expired records, preserves superseded records in storage while excluding them from the active projection, and exposes deterministic cursor ordering. It does not resolve conflicts, choose a winning claim, create a frontend/API surface, or mutate event identity.

## Contracts

- Contract version: `v2.temporal-graph.1`.
- Input owner types: `entity`, `event`, `topic`.
- Input item types: `event`, `article`, `claim`, `relation`.
- Stored timestamps are UTC `DATETIME(6)`; presentation timezone remains an API/UI concern.
- Validity intervals are half-open: `valid_from <= as_of < valid_until`.
- `valid_at` is an as-of visibility bound; future items are excluded.
- `superseded`, `retracted`, `expired`, and `archived` states are retained but excluded from the active projection.
- Unknown-time items remain explicit by default and can be excluded with `includeUnknownTime: false`.
- Ordering is stable by `ordering_key ASC, id ASC`; cursor pagination uses that same tuple.
- Repository operations are caller-owned transactionally. Migration 058 additively persists `valid_from`/`valid_until`; no legacy migration was changed.
- Runtime is feature-gated, deterministic, provider-free, and does not write until the repository is explicitly called.

## Acceptance matrix

| ID | Requirement | Status | Evidence | Dependency | Remaining |
|---|---|---|---|---|---|
| M10-01 | exact as-of projection | COMPLETE | unit + runtime regression | M1 schema | none |
| M10-02 | half-open interval semantics | COMPLETE | unit regression | temporal contract | none |
| M10-03 | UTC normalization and invalid interval rejection | COMPLETE | unit + MySQL regression | M1-D04 | none |
| M10-04 | future exclusion | COMPLETE | unit + MySQL regression | timeline items | none |
| M10-05 | superseded state retained but excluded | COMPLETE | unit regression | existing status fields | none |
| M10-06 | deterministic ordering | COMPLETE | unit regression | timeline ordering key | none |
| M10-07 | cursor pagination contract | COMPLETE | repository unit + MySQL regression | timeline schema | none |
| M10-08 | idempotent timeline persistence | COMPLETE | MySQL regression | migrations 049–050, 058 | none |
| M10-09 | caller transaction and rollback | COMPLETE | MySQL rollback regression | repository boundary | none |
| M10-10 | concurrent timeline writers | COMPLETE | three-worker-safe MySQL regression | unique owner/item keys | none |
| M10-11 | feature OFF/ON behavior | COMPLETE | unit runtime regression | M1.5 flag | none |
| M10-12 | unknown-time explicit semantics | COMPLETE | unit regression | temporal contract | none |
| M10-13 | conflict resolution / winner selection | N/A | reserved for M11 | M11 | M11 scope |
| M10-14 | frontend/API timeline surface | N/A | reserved for M13/M14 | M13/M14 | later scope |
| M10-15 | DST business-day display policy | N/A | Q14 remains deferrable display policy | Q14 | explicit display layer |

Counts: **12 COMPLETE, 0 PARTIAL, 0 NOT STARTED, 0 BLOCKED, 3 N/A**.

## Implementation

- `lib/v2/temporal-graph.js`: strict interval, item, projection and as-of semantics.
- `lib/v2/temporal-graph-repository.js`: timeline upsert, item idempotency, caller-owned persistence and cursor reads.
- `lib/v2/runtime-temporal-graph.js`: feature-gated deterministic runtime boundary.
- `tests/unit/v2-temporal-graph.test.cjs`: validation, boundaries, supersession, ordering, cursor contract and flag behavior.
- `tests/integration/mysql-v2-temporal-graph-m10.test.cjs`: fresh-schema persistence, idempotency, rollback and concurrent workers on MySQL 8.0.46.

## Findings

- **M10-F001 – M10 had no temporal projection implementation despite schema support:** fixed by adding the canonical validator, projection and repository boundary. **FIXED**.
- **M10-F002 – timeline reads could not enforce future/as-of semantics:** fixed with an exclusive interval policy and bounded cursor query. **FIXED**.
- **M10-F003 – timeline retry could overwrite historical temporal bounds:** fixed by detecting an existing identity's temporal tuple and rejecting conflicting retries. **FIXED**.
- **M10-F004 – MySQL DATETIME wall-clock values compared through host timezone:** an identical retry was falsely rejected on non-UTC hosts; fixed with explicit wall-clock normalization before temporal comparison. **FIXED**.

## Validation

- M10 unit: **5/5 PASS**
- M10 MySQL: **3/3 PASS** on MySQL 8.0.46 (fresh 001→058 chain)
- Upgrade migration: **057→058 PASS**
- Offline suite: **323/323 PASS**
- TypeScript: **PASS**
- Import check: **PASS**
- ESLint: **0 errors, 363 warnings**
- `npm run check`: **PASS**
- Production build: **PASS**
- paid AI/provider calls: **0**
- migration: **058 additive timeline validity bounds; latest schema 058**
