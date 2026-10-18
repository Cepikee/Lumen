# Migration audit — schema 064

Static audit date: 2026-10-18. Runtime evidence is reported separately from this source audit.

## Chain

- 64 files, contiguous `001` through `064`; no duplicate, missing or empty migration.
- `node db/migrate.cjs --plan` reports `safe=true`, latest `064`, no critical finding.
- The two warnings are intentional index replacements: migration 027 replaces the prefix URL index with a full SHA-256 generated identity, and migration 059 replaces the long entity-name unique key with a hash plus identity scope.
- No `TRUNCATE` or data `DELETE` appears in the chain. The only `DROP` operations are the two index replacements above.
- Later migrations are additive `CREATE TABLE`/`ALTER TABLE` operations. MySQL DDL atomicity limits still require backup and restore planning for rollout.

## Critical identities and constraints

| Invariant | Constraint/evidence |
|---|---|
| user email and nickname | `uq_users_email`, `uq_users_nickname` |
| session token hash | `uq_user_sessions_token_hash`, FK to user with cascade |
| password/PIN reset token | `uq_password_reset_token`, `uq_pin_reset_token` |
| one view per user/video | `uq_video_views_user_video` |
| canonical article URL identity | generated `url_identity`, `uq_articles_url_identity` |
| processing step identity | `(article_id, step_name)` primary key; unique external operation key |
| email idempotency | `uq_email_outbox_operation` |
| article image uniqueness | `article_id` primary key and FK; image work/fingerprint indexes |
| V2 entity identity | type/language/name hash/scope unique key |
| V2 claim identity | `uq_v2_claims_observation_key` |
| V2 event identity | `uq_v2_events_normalized_key` |
| V2 evidence and relation membership | foreign keys to claim/article/source/run and relation/event tables |

The reconstructed legacy reset-token tables index `userId` but do not add a user foreign key. Runtime tokens are hashed before storage and maintenance removes expired rows; adding legacy foreign keys requires a separate data-cleanup migration because existing installations may contain orphan rows. This is compatibility debt, not silently changed in this pass.

## Required runtime verification

Use a disposable MySQL 8 database only:

1. fresh `001 -> 064` apply;
2. second apply with no changes;
3. checksum mismatch rejection;
4. full MySQL integration harness;
5. `db:status` confirms current `064`, zero pending;
6. production preflight checks the same migration source and schema readiness.

Production database access was not authorized for this recovery.
