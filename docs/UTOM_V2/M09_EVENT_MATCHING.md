# M9 – Event matching, first implementation slice

## Scope

The first M9 slice creates deterministic, review-only event candidates from an article, typed title, optional interval, and known entity references. It does not merge events automatically, resolve conflicts, infer facts, or start M10 temporal projections.

## Contract

- Event identity is a deterministic normalized key from event type, canonical title, and start time.
- Event lifecycle starts at `candidate`; merge authority remains review-only per Q07.
- Article membership is idempotent by the schema's event/article/membership key.
- Entity membership is idempotent by event/entity/role/valid-from.
- Existing schema 057 tables are used; no migration is added.
- Persistence is repository-only and caller-owned transactionally.
- Candidate overlap is classified deterministically, but a possible merge is returned as `review_merge`; no automatic merge occurs.
- The runtime boundary is feature-gated and deterministic; it performs zero AI calls and no DB writes until the caller explicitly invokes the repository.

## Acceptance matrix

Current applicable-slice counts: **12 COMPLETE, 0 PARTIAL, 0 NOT STARTED, 0 BLOCKED, 3 N/A**. Q07 is resolved: automatic merge and split are prohibited; review recommendations are the M9 authority boundary. The existing schema provides append-safe current membership observations (`first_observed_at`/`last_observed_at`); destructive reassignment and canonical merge history remain outside this slice.

| Requirement | Status | Evidence |
|---|---|---|
| deterministic event candidate normalization | COMPLETE | unit regression |
| interval and confidence validation | COMPLETE | unit regression |
| article membership persistence | COMPLETE | repository contract/integration fixture |
| entity membership persistence | COMPLETE | repository contract/integration fixture |
| repeated article coverage | COMPLETE | unique membership upsert |
| temporal overlap classification | COMPLETE | unit regression |
| split/separate candidate classification | COMPLETE | unit regression |
| review-only merge recommendation | COMPLETE | unit regression |
| review-only split recommendation | COMPLETE | disjoint-interval MySQL-free regression |
| feature OFF/ON boundary | COMPLETE | runtime regression |
| retry preserves first evidence reference | COMPLETE | repository contract regression |
| automatic merge | N/A | Q07 requires review authority |
| event conflict resolution | N/A | M11 scope |
| temporal graph projection | N/A | M10 scope |

## Current status

The applicable first slice is complete and checkpointed at commit `121f104` on `develop/utom-recovery`; automatic merge/split mutation, conflict resolution, and temporal graph projection remain explicit boundaries.

## Validation checkpoint

- M9 unit regression: **6/6 PASS**
- M9 MySQL 8.0.46 regression: **2/2 PASS**
- Offline suite: **317/317 PASS**
- TypeScript: **PASS**
- Import check: **PASS**
- ESLint: **0 errors, 362 warnings**
- `npm run check`: **PASS**
- Production build: **PASS**
- Paid AI/provider calls: **0**
- Temporary MySQL database/server: **torn down**

## Findings

- **M9-F001 – ISO timestamps cannot be sent directly to MySQL DATETIME(6)**: reproduced by the MySQL integration test; fixed with explicit UTC conversion in the repository and regression coverage. **FIXED**.
- **M9-F002 – nullable `valid_from` defeats the event-entity unique key in MySQL**: repeated membership created duplicate rows because `NULL` values compare distinct in a unique index; fixed with a null-safe locked lookup followed by update-or-insert. **FIXED**.
- **M9-F003 – invalid lifecycle status and entity validity intervals reached persistence**: candidate validation accepted an unknown event status and inverted/malformed entity validity intervals, deferring failure to the repository or MySQL; fixed by validating status and validity bounds before persistence. **FIXED**.
- **M9-F004 – membership retry could overwrite the first evidence reference**: duplicate article/entity upserts replaced the original provenance pointer with later evidence; fixed by preserving the first non-null evidence reference while still refreshing observation time and confidence. **FIXED**.

## Build OOM evidence

The clean build audit found Node 24.19.0/npm 11.17.0, no orphan Node/Next process, no M9 MySQL process, 20 GB free host memory and 4 GB WSL swap free. The M9 modules are server-only, side-effect free, and have no app/component imports. Before dependency cleanup, a clean default build and 4096 MB heap build failed during Next compilation/page-data workers; an 8192 MB diagnostic build passed. After `npm ci --ignore-scripts` in both the 42279ef baseline and current tree, default and 4096 MB builds passed in both trees. Classification: **PROJECT BUILD MEMORY REGRESSION FROM STALE LOCAL DEPENDENCY STATE, NOT M9 LOGIC**.
