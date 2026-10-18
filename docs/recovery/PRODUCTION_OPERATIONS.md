# UTOM production operations

These files are deployment templates. They were not installed or enabled by this recovery pass.

## Canonical service set

| Unit | Mode | Purpose |
|---|---|---|
| `utom.service` | continuous | Existing Next.js production web application |
| `utom-pipeline.service` | continuous | Feed polling, durable article processing, Speed Index batches |
| `utom-image-worker.service` | continuous | AI illustration queue; optional when image generation is disabled |
| `utom-email-outbox.timer` | one-minute timer | Runs one encrypted outbox delivery attempt per activation |
| `utom-maintenance.timer` | daily timer | Bounded expiry cleanup and optional raw-text retention |

Templates live in `ops/systemd/`. Review `User`, `Group`, `WorkingDirectory`, Node/npm paths and the environment file path against the target host before installation.

## Operational commands

```text
systemctl status utom utom-pipeline utom-image-worker
systemctl list-timers 'utom-*'
journalctl -u utom-pipeline -n 200 --no-pager
journalctl -u utom-image-worker -n 200 --no-pager
journalctl -u utom-email-outbox.service -n 100 --no-pager
journalctl -u utom-maintenance.service -n 100 --no-pager
systemctl restart utom-pipeline
systemctl restart utom-image-worker
```

Manual, foreground checks from a release directory:

```text
npm run production:preflight
npm run feed:fetch:once
npm run image:worker:once
npm run email-outbox:process
npm run maintenance:run
npm run recovery:inspect -- <articleId>
```

Do not run a one-shot image or feed operation concurrently with its continuous worker unless the command documentation explicitly permits it. Never automatically retry `email_outbox.status='uncertain'`; SMTP may have accepted the message before the process stopped.

## Pipeline behavior

- Foreground process, 60-second idle wait, three-article batch.
- Feed fetch is capability-gated and uses the authenticated loopback endpoint.
- Article and step claims use worker IDs, claim tokens, heartbeats and stale fencing.
- External AI steps become `uncertain` across ambiguous crash windows and are not blindly replayed.
- SIGTERM/SIGINT stops new work, waits for the current loop, records the worker stop and closes the MySQL pool.
- stdout/stderr is the canonical journal. `UTOM_PIPELINE_LOG_FILE` is an optional legacy file sink.

## Maintenance behavior

The daily job deletes at most `MAINTENANCE_BATCH_SIZE` rows from each expiry table. It removes expired sessions and reset tokens, old attempt/request/access logs, sent outbox rows and expired rate-limit buckets. It never deletes pending or uncertain email. Raw article text deletion runs only when `UTOM_RETENTION_EXECUTE=true`; all existing retention safety checks still apply.

## Deployment sequence (instructions only)

1. Back up the database and current release; record the installed unit files and environment names.
2. Deploy a reviewed commit to a new release directory and run `npm ci` plus `npm run build` there.
3. Run the migration plan, database status and production preflight against the intended target.
4. Install/review units, then `daemon-reload`; enable timers and workers one at a time.
5. Verify startup events, schema 064, healthy worker heartbeat, bounded backlogs and no duplicate writer.
6. Roll back by stopping new units and switching the web release; do not reverse applied schema migrations without a reviewed database restore plan.
