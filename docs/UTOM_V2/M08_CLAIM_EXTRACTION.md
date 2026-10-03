# M8 – Claim extraction and evidence

M8 canonical claim extraction is mock-first and feature-flagged. It stores atomic source observations; it does not decide truth, resolve entities, detect conflicts, or create events.

## Contract

- Claim types are `numeric`, `categorical`, `text`, `temporal`, `boolean`, `entity`, and `status`.
- Claim status is one of `observed`, `disputed`, `superseded`, `retracted`, or `unresolved`.
- Subject and object entity references are nullable so unresolved references remain explicit.
- Predicate, confidence, temporal interval, JSON value, normalized value, polarity, uncertainty, conditional modality, and attribution are validated before persistence.
- A question, malformed JSON value, non-finite number, invalid interval, unknown field, invalid predicate, or evidence span mismatch is rejected.
- Attribution, negation, uncertainty, conditionality, and units are preserved in the canonical `value_json` metadata; publication time remains separate from observed/valid times.
- Every accepted claim requires an exact article text span and an append-only `v2_claim_evidence` row.

## Persistence

`lib/v2/claim-extraction-repository.js` is repository-only SQL. It uses schema 057 tables `v2_claim_groups`, `v2_claims`, and `v2_claim_evidence`, deterministic observation/span hashes, and caller-owned transactions. It never starts, commits, rolls back, or releases a transaction. Repeating the same article/source/run/span observation is idempotent; a different article or source remains a distinct observation.

## Acceptance matrix

Current gate counts: **13 COMPLETE, 0 PARTIAL, 0 NOT STARTED, 0 BLOCKED, 1 N/A**. The isolated MySQL 8 gate completed successfully; no application blocker or open fixable bug remains.

| Requirement | Status | Evidence |
|---|---|---|
| Atomic claim contract | COMPLETE | strict validator and repository |
| Numeric/categorical/date values | COMPLETE | unit regression |
| Negation, uncertainty, conditional, attribution | COMPLETE | unit regression and value metadata |
| Future/historical valid interval | COMPLETE | temporal validator |
| Unresolved entity references | COMPLETE | nullable subject/object persistence |
| Exact article evidence span | COMPLETE | span validation and evidence insert |
| Invalid JSON / non-finite value rejection | COMPLETE | validator |
| Question is not a claim | COMPLETE | validator |
| Multiple source/article observations | COMPLETE | observation key includes article/source |
| Retry idempotency | COMPLETE | unique observation/span hashes |
| Caller-owned transaction and rollback | COMPLETE | unit and optional MySQL integration |
| Feature OFF/ON | COMPLETE | runtime regression |
| MySQL 8 integration gate | COMPLETE | isolated MySQL 8.0.46, fresh migrations 001→057, claim/evidence gate PASS |
| Paid AI/provider integration | N/A | mock-first by M8 scope |

## Tests

- `tests/unit/v2-claim-extraction.test.cjs`
- `tests/integration/mysql-v2-claim-extraction-m8.test.cjs` (requires opted-in MySQL)

## Findings

- **M8-F001 – evidence insert parameter alignment**: the first repository draft supplied an extra evidence-type parameter while the SQL uses the canonical `claim_span` literal. The mismatch was reproduced by placeholder counting, removed, and locked with a regression assertion requiring nine bound parameters. Status: **FIXED**.
