# M15 – Source comparison

## M15 definition

**Goal:** an event or claim scope can be compared across the canonical source observations already produced by M8–M11. The result is descriptive and review-oriented.

**Inputs:** the existing M13 scope (`eventId` or `claimId`) and, for the opt-in detailed projection, bounded `page` and `limit` values.

**Outputs:** the frozen M13 source summary remains the default response. `detail=claims` adds a versioned projection containing source coverage, canonical claim-group coverage, observed values and units, attribution, temporal intervals, evidence counts and status labels.

**Dimensions:** publication timing, source/article coverage, claim presence/absence, observed value differences, attribution, temporal scope and evidence count. Raw text similarity is outside the scope.

**Persistence/runtime:** on-demand deterministic read projection over existing `articles`, `v2_event_articles`, `v2_claims` and `v2_claim_evidence` rows. No migration, write, AI provider call or materialized comparison table is introduced.

**M14 boundary:** no new frontend panel is added in M15. M14 remains unchanged; a later UI may consume the explicit opt-in contract.

**M13 relationship:** `GET /api/v2/source-comparison?eventId=...` and `?claimId=...` keep their original `scope` + `sources` shape. `detail=claims` is additive and opt-in; invalid detail values are rejected.

**Non-goals:** source ranking, winner selection, trust/bias scoring, majority-as-truth, recency authority, fuzzy text similarity and automatic conflict resolution.

## Acceptance-gap matrix

| ID | Requirement | Status | Existing evidence | Dependency | Remaining |
|---|---|---|---|---|---|
| M15-01 | Existing event/claim scope remains available | COMPLETE | M13 repository/API and regression tests | M13 | none |
| M15-02 | Deterministic source coverage and publication bounds | COMPLETE | `buildSourceComparison`, M15 unit tests | articles, event membership | none |
| M15-03 | Canonical claim-group shared/source-only projection | COMPLETE | `compareSourcesDetailed`, M15 unit tests | M8 claims, M9 events | none |
| M15-04 | Numeric value/unit preservation | COMPLETE | M15 unit fixture | M8 claim value contract | none |
| M15-05 | Attribution and temporal scope preservation | COMPLETE | M15 projection fields and tests | M8/M10 | none |
| M15-06 | Missing coverage is not contradiction | COMPLETE | `coverage: source_only`, no generated conflict | M11 semantics | none |
| M15-07 | Stable ordering and bounded pagination | COMPLETE | bounded `page`/`limit`, stable source/claim order | API envelope | none |
| M15-08 | Empty/unknown/self-safe behavior | COMPLETE | empty projection and M13 scope validation | M13 input contract | none |
| M15-09 | No winner/trust/bias/AI side effect | COMPLETE | explicit authority nulls and providerCalls 0 | M12 policy | none |
| M15-10 | M13 backward compatibility | COMPLETE | existing M13 tests remain green | M13 | none |
| M15-11 | Isolated MySQL 8 fixture and integration gate | COMPLETE | fresh schema 001→058 plus M13/M15 integration fixture passed | MySQL 8 | none |

**Matrix totals:** COMPLETE 11, PARTIAL 0, NOT STARTED 0, BLOCKED 0, N/A 0.

## Comparison contract

- Version: `v2.source-comparison.1`.
- Identity: scope type/id plus canonical claim-group key; source identity uses source ID, with normalized display fallback for missing IDs.
- Ordering: source display name then source ID; claim predicate then stable group key; observation source order is stable.
- Pagination: `page >= 1`, `1 <= limit <= 100`; empty results return `pages: 0`.
- Symmetry: the projection has no directional winner or pair ranking, so reversing source presentation cannot create authority semantics.
- Boundedness: one scope check and one grouped claim query; no per-source or per-claim query loop.

## Validation

- M15 targeted unit/repository regression: PASS (7/7).
- M13 read-model regression: PASS.
- TypeScript: PASS.
- ESLint: 0 errors (existing warnings only).
- Import check: PASS.
- Offline suite: PASS (347/347).
- `npm run check`: PASS, including production build.
- MySQL integration: PASS on isolated MySQL 8.0.46; fresh migrations 001→058, M13 compatibility and M15 fixture all passed.
- No production or paid provider call is used by this slice.

## Findings and final gate

- New M15 application findings: 0.
- Fixed findings: 0; this was an additive missing-capability implementation, not a correction of an existing defect.
- Open fixable bugs: 0.
- Owner questions: 0. Q08 remains an intentionally unused future policy question because M15 exposes no source weighting. Environment blocker: MySQL fixture execution is pending an explicit isolated test URL/opt-in.

`M15 IMPLEMENTATION: COMPLETE`

`M15 COMPLETE: YES`

`M15 IMPLEMENTATION BLOCKER: NONE`

`M15 BLOCKING OWNER QUESTIONS: 0`

`OPEN FIXABLE BUGS: 0`

`NEXT PHASE: M16 – Premium intelligence`
