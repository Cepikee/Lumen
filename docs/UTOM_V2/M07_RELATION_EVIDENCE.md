# UTOM V2 M7 – Relation és evidence

Status: implementation complete for the applicable M7 scope. Claim extraction, event extraction, conflict detection and timeline work remain later milestones.

## Canonical definition

A relation is a directed, typed candidate between two already resolved canonical entities. A relation is not a claim or an event. An evidence row is the append-only article/span observation that supports, contradicts or reports that relation. An article ID alone is not sufficient evidence; the validated text span and deterministic hash are required.

## Acceptance-gap ledger

| Requirement | Status | Evidence | Remaining |
|---|---|---|---|
| Frozen predicate allowlist | COMPLETE | `RELATION_PREDICATES`, validator regression | none |
| Strict relation input | COMPLETE | article/source/run and text validation | none |
| Subject/object resolved entity requirement | COMPLETE | repository entity status check and regression | none |
| Directed relation semantics | COMPLETE | subject/object fields preserved | none |
| Relation/evidence separation | COMPLETE | separate validator, tables and repository writes | none |
| Evidence span bounds and text match | COMPLETE | canonical input text validation regression | none |
| Support/contradict/reported evidence direction | COMPLETE | support type allowlist | none |
| Relation confidence validation | COMPLETE | 0..1 strict validation | none |
| Temporal relation fields | COMPLETE | valid_from/valid_until are carried without invented timestamps | none |
| Deterministic relation identity | COMPLETE | subject/predicate/object/interval hash | none |
| Multiple evidence preservation | COMPLETE | relation identity differs from article/span evidence identity | none |
| Duplicate relation retry | COMPLETE | unique idempotency key and MySQL regression | none |
| Duplicate evidence retry | COMPLETE | relation/evidence unique key and MySQL regression | none |
| Append-only evidence | COMPLETE | evidence uses INSERT-only boundary | none |
| Invalid predicate quarantine | COMPLETE | malformed provider output rejected | none |
| Ambiguous/unresolved entity rejection | COMPLETE | canonical write requires two non-archived entity rows | none |
| Caller-owned transaction | COMPLETE | repository never commits or releases connection | none |
| Rollback atomicity | COMPLETE | MySQL relation/evidence transaction regression | none |
| Feature OFF/ON | COMPLETE | runtime provider call count tests | none |
| Mock-first semantic provider | COMPLETE | injected provider boundary; paid AI remains 0 | Q09/M12 provider policy |
| No claim/event/conflict/timeline creep | N/A | reserved for M8–M11 | later milestones |

## Relation contract

The persisted relation uses `subject_entity_id`, an allowlisted `predicate`, `object_entity_id`, review status, confidence, optional valid interval and deterministic idempotency key. M7 intentionally does not turn a relation into a fact or resolve conflicts. A `support_type` is stored on each evidence row, so contradicting or reported observations remain separate.

## Persistence and safety

`persistRelationWithEvidence` is a repository-only SQL boundary. It requires two existing non-archived entities, inserts or reuses one canonical relation, and inserts or reuses the evidence fingerprint. The caller owns the transaction, commit, rollback and connection lifecycle. No migration was required; schema `057` already contains `v2_entity_relations` and `v2_relation_evidence`.

## Validation

- Unit: `tests/unit/v2-relation-extraction.test.cjs`
- MySQL 8: `tests/integration/mysql-v2-relation-evidence-m7.test.cjs`
- Predicate, span, ambiguity, duplicate relation/evidence, multiple evidence, rollback and feature OFF/ON are covered.
- Paid AI calls: 0.
