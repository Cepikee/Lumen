# Recovery validation report

Validation date: **2026-10-18**. Branch: `develop/utom-recovery`. Base commit: `9b3161fd5aa8ccdeb8784f1c2366e40314426bcc`.

This report describes the uncommitted recovery working tree. It is not deployment evidence.

| Check | Result | Evidence |
|---|---|---|
| Clean dependency install | PASS | `npm ci`, 722 packages installed |
| TypeScript | PASS | `npm run typecheck` |
| ESLint | PASS | 0 errors, 420 existing warnings |
| Local import graph | PASS | `npm run check:imports` |
| Offline suite | PASS | 1151 passed, 0 failed, 1 host-policy symlink skip |
| Security subset | PASS | 47 passed, 0 failed |
| Production build | PASS | Next.js 16.4.2, 76/76 pages generated |
| Aggregate gate | PASS | `npm run check` completed successfully |
| Migration source plan | PASS | 64 contiguous migrations, `001` through `064`, `safe=true` |
| Migration runner unit tests | PASS | 5 passed, including idempotence and checksum rejection |
| Disposable MySQL integration | BLOCKED BY ENVIRONMENT | loopback port 3306 unavailable and `UTOM_TEST_MYSQL_URL` absent |
| Runtime migration `001 -> 064` | BLOCKED BY ENVIRONMENT | requires disposable MySQL 8 |
| Runtime migration second-apply idempotence | BLOCKED BY ENVIRONMENT | requires disposable MySQL 8 |
| Production preflight | BLOCKED BY ENVIRONMENT | production DB/configuration intentionally unavailable; local preflight failed closed |
| Production dependency audit | PASS | 0 vulnerabilities from `npm audit --omit=dev` |
| Full dependency audit | ADVISORY | 5 high-severity dev-only findings in the Next ESLint toolchain (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob`/`micromatch`/`braces`) |
| Diff whitespace check | PASS | `git diff --check`; only platform line-ending notices |

The npm-proposed forced remediation for the full audit would replace the current Next 16 lint toolchain with an incompatible major version. No forced downgrade was applied. Production dependencies remain clean.

No production database, VPS, Cloudflare provider, production environment or installed systemd unit was changed by this recovery.
