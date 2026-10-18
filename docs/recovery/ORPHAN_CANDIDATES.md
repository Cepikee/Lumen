# Orphan and legacy candidates

This is a conservative report. No candidate in this table was deleted. A file is removable only after production, test, migration/recovery and documentation references are all proven absent.

| File or area | Evidence | Runtime/test references | Recommended action |
|---|---|---|---|
| `lib/cron.js`, `lib/cron.ts`, `lib/trend-cron.js` | Old schedulers; canonical pipeline is `pipeline/cron.js` | Covered by legacy-entrypoint tests and historical docs | Retain as fail-closed tombstones until a separate compatibility-removal release |
| `archive/github-workflows/fetch-444.yml.disabled` | Duplicated the canonical seven-source ingestion and had a wrong checkout-relative command | Production does not need it; GitHub does not load workflows from this archive path | Retained outside active workflows for history; remove in a later cleanup release |
| `scripts/fetch-and-post-444.js` | External-posting helper predating canonical ingestion | Historical/security docs reference it | Retain as manual diagnostic helper; never schedule it |
| `scripts/agents/*.bak` | Point-in-time backups of the V2.2 autonomous research harness | Not production-reachable; unique research history | Move to an external research archive only after checksums and an index are recorded |
| `scripts/agents/runs/` | 8 local runs, 104 files, about 1.69 MB | Untracked and excluded by `.git/info/exclude`; not in production releases | Preserve locally; archive outside the runtime checkout before any cleanup |
| `ollama-test.js` | Legacy local-provider diagnostic | No package script or production import found | Candidate for `archive/diagnostics/` after a separate owner review |
| `test-444-feed.js` | Manual 444 diagnostic | Historical security documentation refers to it | Retain until the legacy 444 documentation is retired |
| `INSIGHTS_FIX_README.txt`, `SECURITY_PATCH_README.txt`, `S01_OLVASDEL.md`, `valami.txt`, `fejlesztesinaplo.md` | Root-level historical/scratch documentation | No runtime imports | Index as historical; move only in a dedicated docs-only change |
| `app/dev/`, `app/m14-acceptance/` | Demo/acceptance surfaces | Build-visible routes; tests and V2 docs refer to them | Keep out of public routing in production configuration or remove only after explicit product decision |
| `video-server.js`, `autohirek/`, `app/hirado/` | Híradó stack is implemented but deferred | Tests and product routes exist; FFmpeg is an optional environment dependency | Retain, keep generation disabled, document as deferred |

## Duplicate implementation conclusions

- Article processing has one canonical writer: `pipeline/cron.js`. Legacy schedulers and summarize routes are fail-closed.
- Feed ingestion has one canonical implementation: `/api/fetch-feed` plus `lib/feed-ingestion.js`. `/api/receive-feed` is an authenticated compatibility ingress using the same persistence layer; it is not a second processor.
- V2.2 deterministic NLP is a research path and must not replace V1/V2 providers in production.
- Image generation has one continuous worker. The smoke and one-shot commands share the same service layer and are operator tools, not alternate production workers.
