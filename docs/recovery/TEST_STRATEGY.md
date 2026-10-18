# Canonical test strategy

The suites are separated by side effects and runtime requirements. Test count is evidence from command output, not from the number of files.

| Category | Canonical command | Environment | Purpose |
|---|---|---|---|
| TypeScript | `npm run typecheck` | local | Type and route/component compilation contracts |
| ESLint | `npm run lint` | local | Next/React and repository lint rules |
| Import graph | `npm run check:imports` | local | Resolves statically discoverable local imports |
| Offline unit/contracts | `npm run test:offline` | offline, no DB/provider | V1/V2/V2.2 unit, API/UI contracts and deterministic research regressions |
| Security subset | `npm run test:security` | offline, no provider | Auth policy, dependency guard, SSRF and hardening regressions |
| MySQL integration | `npm run test:integration` | disposable MySQL 8 only | Migration chain/idempotence, pipeline/auth/V2/image/retention behavior |
| Production build | `npm run build` | local | Next production compilation and output tracing |
| Aggregate local gate | `npm run check` | local | TypeScript, lint, imports, offline tests and build |
| Dependency audit | `npm audit --omit=dev`; `npm audit` | registry access | Production and full dependency advisories |

## Classification

- `tests/unit/*`: offline unit and contract tests. V2.2 files are research regressions but remain in the offline suite because they are deterministic and side-effect free.
- `tests/integration/mysql-*`, `v21-canonical-intelligence-e2e.test.cjs`: disposable MySQL integration.
- `tests/integration/http-*`: production-shaped HTTP/auth integration, invoked by the MySQL harness when prerequisites are present.
- `tests/integration/ffmpeg-thumbnail.test.cjs`: optional media capability test; a missing FFmpeg executable is an environment skip, not a database PASS.
- `tests/fixtures/v22-*`, `tests/fixtures/real-text-*`: research/benchmark fixtures, never production input.

No duplicate test was deleted. Similar-looking tests protect different historical regressions or boundary conditions. Consolidation should occur only after coverage mapping proves equivalence.
