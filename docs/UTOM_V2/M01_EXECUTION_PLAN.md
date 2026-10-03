# UTOM V2 – M1 Execution Plan

Projekt: UTOM.HU / Lumen
Branch: develop/utom-recovery
Canonical plan: docs/UTOM_V2/99_IMPLEMENTATION_MASTER_PLAN.md
Status: M1 COMPLETE – integration evidence PASS; owner decisions approved

## 1. M1 identity

Name: V2 contract and schema foundation.

Objective: establish the approved V2 vocabulary, migration conventions, feature-flag boundary, request/correlation contract and additive MySQL schema foundation without changing current user-visible behavior.

Dependencies:
- owner approval of the V2 specification package – RESOLVED 2026-10-02;
- decision on entity/relation/claim/event vocabulary – RESOLVED for M1 initial vocabulary 2026-10-02;
- disposable MySQL 8 environment – required for the later migration validation gate, not a blocker to begin M1.1;
- migration runner audit – M1.2 execution step, not a pre-start approval blocker;
- agreement that legacy tables and routes remain compatible – RESOLVED by M1-D03 2026-10-02.

M1 explicitly does not implement entity extraction, event intelligence, premium UI, V2 public API behavior, backfill or AI calls.

Acceptance gate from the master: schema, IDs, nullability, migrations, contracts and open decisions are approved; migration and contract fixtures pass.

## 2. Owner decision triage

The 12 questions are defined in 91_OPEN_QUESTIONS.md.

### A. Former M1 blockers – resolved

| ID | Question | Specification | Affected milestone | Why it blocks | Options | Codex technical recommendation | Reversible | Wrong-decision migration cost |
|---|---|---|---|---|---|---|---|---|
| Q01 | V2 source pack approval | 90/91 and all V2 specs | M1–M18 | schema and scope cannot be authoritative without source approval | approve package / revise package / defer | approve package with explicit open questions | YES before migration | HIGH |
| Q02 | Entity taxonomy and controlled vocabulary | 11_ENTITY_SYSTEM, 40_DATA_MODEL | M1, M4–M6 | entity_type is a persistence/API contract | fixed first set / extensible registry / free text | fixed controlled first set plus additive registry | COSTLY after data | VERY HIGH |
| Q03 | Legacy compatibility and additive migration policy | 90_DECISIONS, 40_DATA_MODEL | M1 | destructive changes would endanger current Lumen | additive only / replacement / parallel schema | additive tables and no legacy column deletion | YES | HIGH |
| Q04 | Temporal storage and timezone baseline | 16_TEMPORAL_KNOWLEDGE, 30_TIMELINES | M1, M10, M13 | timestamps and interval semantics must be consistent | UTC storage / Budapest storage / mixed | UTC storage, explicit Budapest presentation policy | COSTLY after data | HIGH |
| Q05 | AI diagnostic retention boundary | 20_AI_PIPELINE, 21_AI_COST_ROUTER, 50_COST_AND_SCALING | M1, M12 | ai_runs schema must not accidentally promise unsafe raw retention | metadata only / redacted payload / raw encrypted payload | metadata plus redacted reference; raw payload opt-in later | YES with additive field | MEDIUM |

### B. Does not block M1

| ID | Question | Specification | Affected milestone | Why it does not block | Recommendation |
|---|---|---|---|---|---|
| Q06 | Confidence thresholds | 23_CONFIDENCE_SYSTEM | M5–M11 | M1 can store decimal confidence without selecting merge thresholds | conservative thresholds before M5 |
| Q07 | Event merge authority | 13_EVENT_SYSTEM | M9 | no event writes in M1 | candidate automatic, merge reviewable |
| Q08 | Source trust weighting | 31_SOURCE_COMPARISON, 17_CONFLICT_DETECTION | M11/M15 | schema can store evidence without hidden weighting | no hidden winner |
| Q09 | AI provider and budget | 20/21 | M12 | M1 stores generic provider/model metadata only | mock default and hard budget |
| Q10 | Manual review roles | 22_ENTITY_RESOLUTION, 24_SELF_EXPANDING_KNOWLEDGE | M5/M6 | M1 can store actor/review status without UI | explicit reviewer role before M5 |

### C. Can be deferred

| ID | Question | Specification | Affected milestone | Why defer | Recommendation |
|---|---|---|---|---|---|
| Q11 | Payment, pricing and billing lifecycle | 33_PREMIUM_INTELLIGENCE | M16 | no premium implementation in M1 | keep actions disabled |
| Q12 | Separate reporting database | 50_COST_AND_SCALING | M13/M17 | current volume does not justify a second DB | measure MySQL/read models first |

Owner decisions are recorded with date, authority and rationale in `90_DECISIONS.md`. Codex does not decide product policy.

## 3. Repository impact map

### Existing files to inspect or potentially modify

- db/migrate.cjs – existing migration CLI; EXPECTED – VERIFY DURING IMPLEMENTATION.
- db/migration-core.cjs – migration discovery/checksum/status logic; EXPECTED – VERIFY DURING IMPLEMENTATION.
- db/migrations/001_sources.sql through 033_email_outbox.sql – legacy compatibility baseline; inspect, do not rewrite.
- db/migrations/034_v2_entities.sql through 052_v2_processing_steps.sql – additive V2 M1.4 schema.
- db/UTOM_TELJES_REKONSTRUALT_ADATBAZIS.sql – alternative schema reference; read-only reference.
- lib/db.ts – connection/pool convention; EXPECTED – VERIFY DURING IMPLEMENTATION.
- lib/runtime-config.ts or equivalent runtime configuration modules – feature flag location; EXPECTED – VERIFY DURING IMPLEMENTATION.
- lib/operations.js and lib/safe-log.js – operation identity and safe diagnostics patterns.
- tests/unit/migration-core.test.cjs and tests/unit/operations.test.cjs – existing regression patterns.
- tests/integration/mysql-pipeline-recovery.test.cjs and migration workers – MySQL validation harness.
- package.json – only if a schema-validation test script is required; no dependency change is assumed.
- docs/UTOM_V2/90_DECISIONS.md, 91_OPEN_QUESTIONS.md, 99_IMPLEMENTATION_MASTER_PLAN.md – decision and traceability updates.

### New files expected

These are plans, not existing files. Each path is EXPECTED – VERIFY DURING IMPLEMENTATION:

- db/migrations/034_v2_entities.sql through db/migrations/052_v2_processing_steps.sql
- lib/v2/schema-contract.ts or .js
- lib/v2/feature-flags.ts or .js
- lib/v2/request-context.ts or .js
- tests/unit/v2-schema-contract.test.cjs
- tests/unit/v2-feature-flags.test.cjs
- tests/integration/mysql-v2-schema.test.cjs

No app/api route, frontend component or AI provider file is part of M1 unless the owner explicitly expands scope.

### Database migration scope

One additive migration is preferred for the first clean foundation, or a small ordered set if the migration runner requires table-size separation. It must create only V2 tables and indexes. No existing table drop/rename, no data backfill, no production apply.

### Existing tables affected

- schema_migrations: runner ledger only; no semantic change.
- articles: no M1 column change preferred; future foreign keys reference it.
- users: no M1 entitlement change.
- sources: no M1 source policy change.
- summaries, trends, clusters: read-only compatibility references.
- article_processing_steps: no M1 step registration; V2 steps begin later.

### Tests affected

Existing migration-core, import, TypeScript and offline suites remain gates. New schema tests are additive. M1.4 was validated on an isolated MySQL 8.0.46 instance; the full recovery integration suite remains a separate opt-in gate.

## 4. M1 data model delta

M1 creates foundation tables but does not write application data yet.

### v2_entities

- id: BIGINT UNSIGNED, PK, auto increment, NOT NULL
- entity_type: VARCHAR(32) or approved enum strategy, NOT NULL
- canonical_name: VARCHAR(512), NOT NULL
- normalized_name: VARCHAR(512), NOT NULL
- language: VARCHAR(16), NOT NULL, default hu
- status: VARCHAR(24), NOT NULL, default review
- canonical_entity_id: BIGINT UNSIGNED NULL, self-FK, ON DELETE SET NULL
- confidence_current: DECIMAL(5,4) NULL
- first_observed_at, last_observed_at: DATETIME(6) NULL
- created_at, updated_at: DATETIME(6) NOT NULL
- unique identity key on entity_type, language, normalized_name
- indexes status, canonical_entity_id, last_observed_at
- lifecycle review to active/merged/disputed/archived
- idempotency identity key prevents duplicate canonical entities

### v2_entity_aliases

- id, entity_id FK ON DELETE CASCADE
- alias and normalized_alias VARCHAR(512), language VARCHAR(16)
- alias_type VARCHAR(32), confidence DECIMAL(5,4) NULL
- status and valid_from/valid_until
- unique entity_id, normalized_alias, language
- index normalized_alias, status
- alias inserts are idempotent; weak aliases remain review.

### v2_entity_mentions

- id, article_id BIGINT UNSIGNED FK to articles ON DELETE CASCADE
- summary_id BIGINT UNSIGNED NULL, entity_id BIGINT UNSIGNED NULL
- raw_text, normalized_text, start_offset, end_offset
- extraction_run_id VARCHAR(128), confidence, resolution_status
- index article, entity, resolution status
- unresolved mentions are valid and must not become orphan relations.

### v2_entity_relations

- id, subject_entity_id FK, object_entity_id nullable FK
- predicate VARCHAR(64), object_value JSON nullable
- status, confidence, valid_from/valid_until, first/last_observed_at
- superseded_by nullable self-FK
- unique relation identity/fingerprint
- indexes subject/predicate, object/predicate, status/valid interval
- relation delete is not a normal operation; supersede/dispute preserves history.

### v2_relation_evidence

- id, relation_id FK CASCADE, article_id FK CASCADE, source_id FK SET NULL
- evidence_hash, text_span, support_type, extraction_run_id, confidence
- unique relation_id, evidence_hash
- append-only; duplicate retry is ignored by unique key.

### v2_events, v2_event_entities, v2_event_articles

Events store type, normalized key, title, lifecycle status, confidence, start/end and observed timestamps, supersession pointer. Join tables reference events/entities/articles with role or membership type, confidence and validity. Each join has a unique idempotency key and cascade only from the owning event/article according to approved FK policy.

### v2_claims, v2_claim_groups, v2_claim_evidence

Claims store subject/object references, predicate, value JSON, normalized value, claim type, source article, source, valid/observed times, status, confidence and extraction run. Claim groups represent competing observations; evidence is append-only with span/hash uniqueness. No table field implies truth merely because it is latest.

### v2_conflicts, v2_confidence_history, v2_entity_graph_history

Conflicts store type, fingerprint, scope, severity, state and resolution audit. Confidence and graph history are append-only. These tables must support rerun idempotency and rollback by logical supersession.

### v2_timelines, v2_timeline_items

Timeline foundation stores owner type/id, visibility, item reference, valid/display time and deterministic ordering key. M1 creates schema only; no projections or public reads.

### v2_ai_runs, v2_ai_decisions, v2_processing_steps

These store metadata, not unrestricted raw provider output: schema/model version, input hash, status, token/cost metadata, cache/escalation reason, retry and timestamps. Processing steps use article/step/input fingerprint uniqueness and claim/heartbeat fields compatible with the existing state machine.

### Migration and race rules

- clean database migration must be atomic per DDL statement and ledgered;
- duplicate inserts are prevented by unique keys, not read-before-write;
- foreign keys prevent orphaned references;
- concurrent workers use unique keys and later claim transactions;
- rollback means disable flag or revert disposable DB; production down migration is not automatic;
- M2–M18 can add indexes/columns additively without changing identity keys.

## 5. Implementation steps

### M1.1 – Owner decision and contract freeze

Status: **COMPLETE – 2026-10-03**

Canonical contract-freeze record: `docs/UTOM_V2/M11_CONTRACT_FREEZE.md`.
The freeze covers the entity, alias, relation, claim, evidence, event, temporal,
confidence, conflict, extraction, AI Cost Router boundary, AI run audit,
identity/deduplication, legacy compatibility, versioning and API envelope
contracts. This step changed documentation only; it did not implement a
migration, runtime worker, resolver, extractor, frontend or provider call.

Objective: record Q01–Q05 decisions and approved vocabulary.
Scope: docs/UTOM_V2 decisions, entity/predicate/status lists, schemaVersion and error envelope.
Dependencies: owner review – COMPLETE 2026-10-02.
Expected files: 90_DECISIONS.md, 91_OPEN_QUESTIONS.md, 99_IMPLEMENTATION_MASTER_PLAN.md, M11_CONTRACT_FREEZE.md.
Tests: document consistency and traceability check.
Failure modes: ambiguous vocabulary, contradictory decision log.
Acceptance: PASS when all five blocking decisions have owner/date/rationale.

### M1.2 – Migration runner compatibility audit

Status: **COMPLETE – 2026-10-03**. Canonical audit: `docs/UTOM_V2/M12_MIGRATION_RUNNER_COMPATIBILITY_AUDIT.md`.
The runner requires no code change before the first V2 migration. The known
MySQL DDL/ledger crash window remains an operational restore-and-inspection
constraint, already covered by the recovery policy; it is not a new runner
incompatibility.

Objective: prove how 034 migration is discovered, checksummed and status-reported.
Scope: db/migration-core.cjs, db/migrate.cjs, existing migration naming and checksum rules.
Dependencies: M1.1.
Expected files: existing runner only if a bug is found; otherwise no code change.
Tests: migration plan/status tests with a temporary fixture.
Failure modes: skipped migration, checksum drift, partial ledger.
Acceptance: PASS when clean and current fixture behavior is deterministic.

### M1.3 – V2 schema contract fixture

Status: **COMPLETE – 2026-10-03**. Canonical fixture: `tests/fixtures/v2-schema-contract.cjs`; contract test: `tests/unit/v2-schema-contract.test.cjs`; audit record: `docs/UTOM_V2/M13_SCHEMA_CONTRACT_FIXTURE.md`.

The fixture freezes 19 additive V2 table contracts without executable SQL or runtime dependency. No `034` migration was created.

Objective: freeze table names, columns, nullability, FK and unique constraints before SQL.
Scope: schema contract representation and review fixture; no migration yet.
Dependencies: M1.1.
Expected files: lib/v2/schema-contract expected, tests/unit/v2-schema-contract expected.
Tests: required table/column/index/FK assertions.
Failure modes: missing future relation/evidence path, accidental legacy coupling.
Acceptance: PASS when every M1 table delta is represented and traceable.

### M1.4 – Additive migration implementation

Status: **COMPLETE – 2026-10-03**. Canonical evidence: `docs/UTOM_V2/M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md`.

The single-statement runner contract requires the 19-table fixture to be implemented as migrations `034`–`052`; the latest schema version is `052`. The readiness expectation was updated from `033` to `052`; no V2 runtime write path or backfill was introduced.

Objective: implement the additive V2 schema as one single-statement migration per contract table after approval.
Scope: new V2 tables and indexes; no writes or backfill.
Dependencies: M1.2 and M1.3.
Expected files: db/migrations/034_v2_entities.sql through db/migrations/052_v2_processing_steps.sql.
Tests: migration plan, clean MySQL apply, repeat apply and FK/unique fixture.
Failure modes: partial DDL, collation mismatch, FK order, unsupported MySQL syntax.
Acceptance: PASS on disposable MySQL only; otherwise BLOCKED.

### M1.5 – Feature flag and request context foundation

Status: **COMPLETE – 2026-10-03**. Canonical evidence:
`docs/UTOM_V2/M15_FEATURE_FLAG_REQUEST_CONTEXT.md`.

Objective: define V2 disabled-by-default boundary and correlation ID contract.
Scope: configuration reader and request/run context only; no V2 route behavior.
Dependencies: M1.1.
Implemented files: `lib/config/runtime.js`, `lib/v2/contract-versions.js`,
`lib/v2/feature-flags.js`, `lib/v2/request-context.js`, `.env.example` and
their focused unit tests.
Tests: default off, explicit environment parsing, stable request/run identity,
immutable JSON-safe context, malformed input rejection, TypeScript, import
check, offline suite and affected ESLint.
Failure modes: accidental default-on, secret logging, incompatible runtime config.
Acceptance: PASS. Existing routes have no V2 business branch; the flag is
fail-closed and the foundation has no DB, AI or network side effect.

### M1.6 – Repository contract and import validation

Status: **COMPLETE – 2026-10-03**. Canonical evidence:
`docs/UTOM_V2/M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md`.

Objective: make the foundation consumable without introducing runtime side effects.
Scope: local imports, type declarations, documentation links.
Dependencies: M1.3–M1.5.
Implemented files: `lib/v2/repository-contract.js` and
`tests/unit/v2-repository-contract.test.cjs`; existing M1.5 modules were
validated without adding a persistence consumer.
Tests: repository boundary, import graph, fixture reverse-dependency,
side-effect, TypeScript, import check, offline suite and ESLint.
Failure modes: server-only module imported into client, circular import, changed startup.
Acceptance: PASS. The V2 graph is acyclic, fixture/test imports remain outside
runtime, and all existing gates remain green.

### M1.7 – Integration gate and evidence package

Objective: record results and freeze M1 checkpoint.
Scope: migration output, schema diff, tests, decision log, rollback record.
Dependencies: M1.4–M1.6.
Expected files: M1 evidence under docs/UTOM_V2 or CI artifact path.
Tests: full required gate set.
Failure modes: unverified MySQL or unresolved owner decision.
Acceptance: PASS only if all mandatory checks PASS; MySQL absence is BLOCKED, not PASS.

## 6. Test plan

Mandatory statuses after implementation:

- schema contract fixture: PASS/FAIL
- migration clean database: PASS/FAIL/BLOCKED
- migration current fixture: PASS/FAIL/BLOCKED
- repeat migration idempotency: PASS/FAIL/BLOCKED
- duplicate canonical entity/relation fixture: PASS/FAIL
- FK integrity and orphan prevention: PASS/FAIL/BLOCKED
- null/invalid status and identity edge cases: PASS/FAIL
- migration rollback/disable rehearsal: PASS/FAIL
- TypeScript: PASS/FAIL
- import check: PASS/FAIL
- offline regression: PASS/FAIL
- ESLint: PASS/FAIL
- MySQL integration: PASS/FAIL/BLOCKED

M1 happy path alone is insufficient. Include concurrent insert, malformed identifier, null optional FK, duplicate retry, partial migration, and old-table compatibility.

## 7. Failure modes

- partial migration: ledger and disposable DB inspection; do not mark PASS;
- duplicate insert: unique constraint and retry-safe insert;
- concurrent insert: unique conflict handled as already-existing;
- orphan relation: FK rejects it or unresolved nullable mention remains;
- transaction rollback: no partial projection;
- invalid existing data: quarantine/report before backfill;
- old code compatibility: V2 disabled and legacy reads unchanged;
- deployment order: migration first, flag off, then read-only verification;
- missing MySQL: BLOCKED / NOT EXECUTED, never fabricated.

## 8. Rollback

Before any real implementation, take schema backup and use disposable database rehearsal. If M1 fails:

1. keep V2 flag disabled;
2. stop new V2 workers;
3. do not route existing traffic to V2;
4. on disposable DB, drop only newly created V2 tables in reverse dependency order;
5. on a shared database, use an approved forward-fix or restore plan, not an ad-hoc destructive down migration;
6. verify legacy API, feed, auth and premium behavior unchanged.

No legacy data is deleted by M1. Feature flag rollback is always possible; production schema rollback is COSTLY and requires owner approval.

## 9. M1 acceptance gate

M1 can be PASS only when:

1. Q01–Q05 have owner decisions;
2. all entity/relation/claim/event/status vocabulary is versioned;
3. migration runner plan is deterministic;
4. schema contract fixture passes;
5. clean MySQL migration passes;
6. current fixture migration passes;
7. repeat migration is idempotent;
8. all FK and unique constraints are present;
9. null and duplicate fixtures pass;
10. V2 defaults off;
11. existing application behavior is unchanged;
12. TypeScript, import, offline and ESLint pass;
13. rollback/disable procedure is documented;
14. traceability and evidence package are complete.

Any MySQL item without MySQL is BLOCKED, not PASS. M1 implementation may begin because Q01–Q05 are RESOLVED; MySQL remains required for the later schema validation gate.

## 10. M1 OWNER DECISION GATE

### Decision M1-D01

Kérdés: A létrehozott V2 specifikációs csomag az M1 hivatalos termék- és architektúraforrása legyen?

Opció A: igen, nyitott kérdésekkel együtt.
Opció B: módosítás után új review.
Opció C: M1 halasztása.

Codex recommendation: A, explicit owner/date bejegyzéssel.

Mi történik, ha rosszul döntünk: minden schema/API későbbi újraírása és traceability törése.

Visszafordítható később: COSTLY.

OWNER DECISION: APPROVED – OPTION A (2026-10-02)

### Decision M1-D02

Kérdés: Az első V2 entity vocabulary kontrollált, additív lista legyen?

Opció A: fixed first set plus future registry.
Opció B: szabad szöveges entity type.
Opció C: minden típus csak későbbi milestone-ban.

Codex recommendation: A.

Mi történik, ha rosszul döntünk: rossz index/API contract vagy unsafe merge.

Visszafordítható később: COSTLY.

OWNER DECISION: APPROVED – OPTION A (2026-10-02)

### Decision M1-D03

Kérdés: A V2 schema kizárólag additive legyen, legacy tables/columns törlése nélkül?

Opció A: additive.
Opció B: parallel replacement.
Opció C: big-bang replacement.

Codex recommendation: A.

Mi történik, ha rosszul döntünk: legacy feed/auth/pipeline regresszió és adatvesztési kockázat.

Visszafordítható később: YES, a removal később külön gate.

OWNER DECISION: APPROVED – OPTION A (2026-10-02)

### Decision M1-D04

Kérdés: A V2 minden timestampje UTC-ben legyen, explicit Budapest presentation policy-val?

Opció A: UTC storage, Budapest display.
Opció B: Budapest storage.
Opció C: endpointonként eltérő.

Codex recommendation: A.

Mi történik, ha rosszul döntünk: DST és as-of timeline eltérés, drága backfill.

Visszafordítható később: COSTLY.

OWNER DECISION: APPROVED – OPTION A (2026-10-02)

### Decision M1-D05

Kérdés: M1-ben az AI run táblák raw provider output helyett metadata és redacted reference adatot tároljanak?

Opció A: metadata/redacted reference.
Opció B: encrypted raw output.
Opció C: raw plaintext output.

Codex recommendation: A, retention és privacy döntésig.

Mi történik, ha rosszul döntünk: privacy, költség és törlési kötelezettség.

Visszafordítható később: YES, raw payload mező additív.

OWNER DECISION: APPROVED – OPTION A (2026-10-02)

Az öt M1 döntési kapu RESOLVED állapotú; az implementáció az M1.1 lépéssel megkezdhető.

## 11. Technikai ajánlások

- CODEX TECHNICAL RECOMMENDATION: M1-ben ne legyen V2 public API vagy frontend panel.
- CODEX TECHNICAL RECOMMENDATION: a jelenlegi migration runner maradjon, új graph DB ne kerüljön be.
- CODEX TECHNICAL RECOMMENDATION: minden identity/fingerprint unique constraint legyen adatbázisban is.
- CODEX TECHNICAL RECOMMENDATION: UTC storage és explicit timezone conversion legyen az egyetlen temporal baseline.
- CODEX TECHNICAL RECOMMENDATION: V2 flag alapértelmezésben OFF.
- CODEX TECHNICAL RECOMMENDATION: MySQL integration nélkül M1 schema gate nem minősíthető PASS-nak.

## 12. Complexity estimate

Overall: MEDIUM–LARGE.

- migration complexity: LARGE
- backend/config complexity: MEDIUM
- AI complexity: SMALL in M1, large later
- frontend complexity: SMALL in M1
- test complexity: LARGE
- regression risk: MEDIUM–HIGH because schema and legacy compatibility intersect

A pontos órabecslés nem indokolt és nem adható megbízhatóan a MySQL környezet és owner döntések nélkül.

## 13. Canonical M1 status

- M1 EXECUTION PLAN: COMPLETE
- M1.1 CONTRACT FREEZE: COMPLETE – `docs/UTOM_V2/M11_CONTRACT_FREEZE.md`
- M1.2 MIGRATION RUNNER AUDIT: COMPLETE – `docs/UTOM_V2/M12_MIGRATION_RUNNER_COMPATIBILITY_AUDIT.md`
- M1.3 SCHEMA CONTRACT FIXTURE: COMPLETE – `docs/UTOM_V2/M13_SCHEMA_CONTRACT_FIXTURE.md`
- M1.4 ADDITIVE MIGRATION: COMPLETE – `docs/UTOM_V2/M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md`
- M1.5 FEATURE FLAG / REQUEST CONTEXT: COMPLETE – `docs/UTOM_V2/M15_FEATURE_FLAG_REQUEST_CONTEXT.md`
- M1.6 REPOSITORY CONTRACT / IMPORT VALIDATION: COMPLETE – `docs/UTOM_V2/M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md`
- M1.7 INTEGRATION GATE / EVIDENCE: COMPLETE – `docs/UTOM_V2/M17_INTEGRATION_GATE_EVIDENCE.md`
- M1 OWNER DECISION GATE: RESOLVED – 5/5
- M1 IMPLEMENTATION: COMPLETE – all gates PASS; no V2 business behavior
- Implementation started by this document: YES – foundation, boundary and evidence only
