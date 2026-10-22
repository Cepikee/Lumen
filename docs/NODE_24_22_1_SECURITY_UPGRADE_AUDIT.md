# UTOM Node.js 24.22.1 security upgrade audit

Audit date: 2026-10-22  
Target runtime: Node.js 24.22.1 LTS  
Production change performed: no

## Decision

The repository is ready for a controlled Node.js 24.22.1 VPS runtime upgrade. The patch is security-sensitive because UTOM downloads and parses untrusted RSS and article responses. Source and dependency changes beyond the runtime guard are not required by the available evidence.

Deployment remains conditional on a maintenance-window preflight on the VPS: confirm the installed package origin and exact 24.22.1 package version, preserve the current package for rollback, stop every active Node process that uses `/usr/bin/node`, install the patch, rebuild with the new runtime, run the production preflight, and only then restart services that were active before the change. The disabled AI pipeline must remain disabled.

## Security impact

Official sources:

- <https://nodejs.org/en/blog/vulnerability/october-2026-security-releases>
- <https://nodejs.org/en/blog/release/v24.22.1>

### Direct or conditional exposure

| Change | UTOM exposure | Assessment |
| --- | --- | --- |
| CVE-2026-111497, Brotli decoder memory corruption/RCE | `app/api/fetch-feed/route.ts`, `pipeline/scrapeArticle.js`, and `app/api/analyze/route.ts` download attacker-influenced HTTP responses through Undici. A remote source can return Brotli-compressed data, which the Node runtime decompresses before the application parses it. | Direct runtime exposure is possible when a configured/public news endpoint returns Brotli. Upgrade is urgent. No exploit was reproduced. |
| CVE-2026-105482, DNS NUL input validation | `lib/safe-fetch.js` uses `node:dns/promises.lookup` for all addresses and pins the selected socket. The repository does not call `dns.resolve*`. | The vulnerable c-ares path was not proven reachable from UTOM's resolver call. Runtime upgrade is still required as defence in depth. |
| CVE-2026-105483 and CVE-2026-106069, TLS/IP validation | External RSS/article URLs and fixed Cloudflare, Google, and Turnstile endpoints use HTTPS. | Conditional exposure in Node TLS/hostname validation. `safe-fetch` rejects credentials, unsafe ports, private/reserved addresses and every unsafe redirect, and preserves Host/SNI, reducing SSRF/rebinding risk but not replacing the runtime fix. |
| CVE-2026-105481, HTTP keep-alive parsing | Undici agents and global `fetch` reuse external HTTP connections. | Conditional exposure on long-lived external HTTP clients. Upgrade required. |
| OpenSSL 3.5.9 and certificate bundle update | All HTTPS integrations inherit the runtime TLS and trust store. No `rejectUnauthorized: false` usage was found. | Security improvement with a small operational risk that a misconfigured legacy chain is rejected. Test every external provider after deployment. |
| Undici 7.30.1 | The app already pins `undici` 7.30.1; Node 24.22.1 also updates its bundled Undici. | No package change required. Both explicit and built-in clients must run on the patched runtime. |
| c-ares 1.34.9 | No direct `dns.resolve*` use; `dns.lookup` is used for pinning. | No source change required. |

Additional vulnerabilities listed in the same Node advisory were checked: non-canonical IPv4 forms are rejected by URL/address validation and the pinned resolver; the app does not use Node permission-model flags or single-executable snapshots, so the permission realpath and snapshot RNG issues are not proven application paths.

## Repository compatibility

- Next.js 16.4.2 declares Node `>=20.9.0` and builds successfully on 24.22.1.
- React 19.2 is runtime-neutral for this patch.
- `mysql2` 3.24.4 declares Node `>=8`; query and wrapper contract tests pass.
- `bcrypt` 6.0.0 declares Node `>=18`; auth policy and response tests pass. The clean npm install warned that npm's install-script allowlist did not run the package install script. The available tests do not prove Linux native binding installation, so loading and one local hash/compare operation must be confirmed during VPS preflight.
- `sharp` 0.35.5 declares Node `>=20.9`; its optional legacy-CPU fallback tests pass. Production readiness does not require Sharp optimization.
- `rss-parser` 3.13 and the pinned external fetch path pass their offline regression tests.
- The production dependency audit reports 0 vulnerabilities. The full development graph reports 5 high findings in `@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, and `micromatch`; these are outside the production dependency graph and are not changed as part of the Node patch.
- Repository systemd units invoke `/usr/bin/npm`, so the resolved `/usr/bin/node` runtime affects the web service and the image worker, optional pipeline worker, email outbox, and maintenance jobs.

## Implemented guard

The previous production preflight accepted every Node 24 release, including vulnerable 24.21.0. The repository and active CI now require Node 24.22.1 or a later stable 24.x patch. The guard rejects prereleases and Node 23/25.

Changed runtime declarations:

- `.nvmrc`: `24.22.1`
- `package.json` and lockfile root engine: `>=24.22.1 <25`
- active GitHub workflows: exact `24.22.1`
- production preflight: semantic minimum-version check using `lib/runtime-version.cjs`
- unit regression: vulnerable, prerelease and wrong-major versions fail closed; repository pins remain consistent

No ingestion, auth, premium, Trends, image, database, worker, or feature-flag behavior was changed.

## Validation evidence

The isolated runtime was the official Windows x64 Node.js 24.22.1 distribution. Its downloaded archive SHA-256 matched the official release checksum: `d2046d28c2c3dcd211ac5145c0bf30e2047ef9dfb306693c8c6e2eccd8b95fa5`.

| Check | Runtime | Result |
| --- | --- | --- |
| Clean `npm ci` | Node 24.22.1 / npm 11.19.1 | PASS, 722 packages installed |
| Runtime/security regressions | Node 24.22.1 | PASS, 15/15 |
| RSS, auth, premium, Trends, image, worker and maintenance targeted group | Node 24.22.1 | PASS, 143 pass / 0 fail / 1 host-policy symlink skip |
| TypeScript (`tsc --noEmit`) | Node 24.22.1 | PASS |
| ESLint | Node 24.22.1 | PASS with 0 errors and 420 pre-existing warnings |
| Local import check | Node 24.22.1 | PASS |
| Production dependency audit | npm 11.19.1 | PASS, 0 vulnerabilities |
| Production build | Node 24.22.1 | PASS, 76/76 routes generated |
| HTTP smoke | Node 24.22.1 | PASS: `/trends` 200, `/api/auth/me` 200 anonymous contract, `/api/health` 200 |
| Trends API without local DB | Node 24.22.1 | Fail-closed 429 rate-limit response; no DB write |
| Full offline suite | Node 24.22.1 | PARTIAL: 1285 pass / 2 fail / 1 skip |
| Local MySQL integration | Node 24.22.1 | SKIP: `127.0.0.1:3306` unavailable |

The two full-suite failures are baseline failures, reproduced unchanged on the original local Node 24.19.0 runtime. `frontend-runtime-safety-batch.test.cjs` and `sparkline-frequency-null.test.cjs` still assert the former `SparklineDetailed` source structure after the recent Trend Intelligence chart refactor. They are unrelated to Node 24.22.1 and were not rewritten in this security patch.

No paid AI call, external provider call, production database write, production configuration change, commit, push, or deployment was performed.

## VPS upgrade runbook

Run in a scheduled maintenance window. Do not paste production secrets into the shell history.

### 1. Identify installation and every consumer

```bash
set -euo pipefail
cd /srv/utom/app
date -Is
command -v node npm
readlink -f "$(command -v node)"
readlink -f "$(command -v npm)"
node --version
npm --version
dpkg-query -W -f='${Package} ${Version}\n' nodejs 2>/dev/null || true
dpkg-query -S /usr/bin/node 2>/dev/null || true
apt-cache policy nodejs
systemctl cat utom.service
systemctl cat utom-image-worker.service utom-pipeline.service utom-email-outbox.service utom-maintenance.service 2>/dev/null || true
systemctl list-units --type=service --all 'utom*'
systemctl list-timers --all 'utom*'
pgrep -a -f 'node|npm|next' || true
```

If `/usr/bin/node` is not owned by the Ubuntu/NodeSource `nodejs` package, stop and use the installation method discovered above. Do not mix package managers.

### 2. Prove availability and preserve rollback material

```bash
set -euo pipefail
old_node_version="$(node --version)"
old_package_version="$(dpkg-query -W -f='${Version}' nodejs)"
target_package_version="$(apt-cache madison nodejs | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); if ($2 ~ /^24\.22\.1-/) {print $2; exit}}')"
test -n "$target_package_version"
printf 'old node=%s old package=%s target package=%s\n' "$old_node_version" "$old_package_version" "$target_package_version"
mkdir -p /var/backups/utom-node-24.22.1
apt-get download "nodejs=$old_package_version"
mv "nodejs_${old_package_version}"*.deb /var/backups/utom-node-24.22.1/
cp package.json package-lock.json /var/backups/utom-node-24.22.1/
systemctl is-active utom.service utom-image-worker.service utom-pipeline.service utom-email-outbox.timer utom-maintenance.timer \
  | tee /var/backups/utom-node-24.22.1/unit-active-state.txt || true
```

Review the printed version values before continuing. The exact apt revision suffix is deliberately discovered from the configured repository instead of being guessed.

### 3. Quiesce active Node work and install

```bash
set -euo pipefail
systemctl stop utom-email-outbox.timer utom-maintenance.timer
systemctl stop utom-image-worker.service utom.service
systemctl is-active --quiet utom-pipeline.service && systemctl stop utom-pipeline.service || true
systemctl stop utom-email-outbox.service utom-maintenance.service 2>/dev/null || true
pgrep -a -f '/srv/utom/app|next|article-image-worker|pipeline' || true
apt-get update
apt-get install --only-upgrade "nodejs=$target_package_version"
/usr/bin/node --version
/usr/bin/npm --version
test "$(/usr/bin/node --version)" = 'v24.22.1'
sudo -u utom -H /usr/bin/node --version
```

Do not continue unless both root and the `utom` service user resolve exactly v24.22.1.

### 4. Reinstall, build and preflight

```bash
set -euo pipefail
cd /srv/utom/app
sudo -u utom -H /usr/bin/npm ci
sudo -u utom -H /usr/bin/node -e "const bcrypt=require('bcrypt'); const value='node-24-runtime-smoke'; const hash=bcrypt.hashSync(value,4); if(!bcrypt.compareSync(value,hash)) process.exit(1); console.log('bcrypt native smoke: PASS')"
sudo -u utom -H /usr/bin/npm run typecheck
sudo -u utom -H /usr/bin/npm run build
sudo -u utom -H /usr/bin/npm run production:preflight
```

The last command requires the production environment and MySQL readiness expected by the existing preflight. Stop on any failure. It now fails if Node is older than 24.22.1.

### 5. Restart only the previously enabled services

```bash
set -euo pipefail
systemctl daemon-reload
systemctl start utom.service
systemctl start utom-image-worker.service
systemctl start utom-email-outbox.timer utom-maintenance.timer
systemctl is-active utom.service utom-image-worker.service
systemctl is-enabled utom-pipeline.service || true
systemctl is-active utom-pipeline.service || true
```

Do **not** enable or start `utom-pipeline.service` when it was disabled before the maintenance window.

### 6. Smoke and logs

```bash
set -euo pipefail
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
curl --fail --silent --show-error --output /dev/null http://127.0.0.1:3000/trends
curl --fail --silent --show-error http://127.0.0.1:3000/api/auth/me
systemctl --no-pager --full status utom.service utom-image-worker.service
journalctl --since '-10 minutes' -u utom.service -u utom-image-worker.service \
  -u utom-email-outbox.service -u utom-maintenance.service --no-pager
```

Also perform one read-only browser check of login, premium entitlement rendering, `/trends`, and an article image. Do not trigger paid AI generation.

### 7. Rollback

Use rollback if install, native module load, build, preflight, service startup, or smoke fails:

```bash
set -euo pipefail
systemctl stop utom-email-outbox.timer utom-maintenance.timer utom-image-worker.service utom.service
systemctl is-active --quiet utom-pipeline.service && systemctl stop utom-pipeline.service || true
old_deb="$(find /var/backups/utom-node-24.22.1 -maxdepth 1 -type f -name 'nodejs_*.deb' -print -quit)"
test -n "$old_deb"
apt-get install --allow-downgrades "$old_deb"
/usr/bin/node --version
cd /srv/utom/app
sudo -u utom -H /usr/bin/npm ci
sudo -u utom -H /usr/bin/npm run build
systemctl start utom.service utom-image-worker.service
systemctl start utom-email-outbox.timer utom-maintenance.timer
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
journalctl --since '-10 minutes' -u utom.service -u utom-image-worker.service --no-pager
```

Restore only units recorded as active before the upgrade. The disabled AI pipeline remains disabled during rollback as well.

## Residual risks

1. Linux-native `bcrypt`, Sharp and SWC loading was not exercised on the Windows host; the VPS clean install/build and preflight are mandatory.
2. Local MySQL was unavailable, so live MySQL 8 connectivity and schema readiness must be proven by the VPS preflight without writes beyond normal connection setup.
3. The two stale chart source-shape tests keep the full offline suite from being globally green. Their failures predate and are independent of this runtime patch.
4. External RSS/TLS behavior was verified with local deterministic tests, not by calling real providers; post-upgrade provider logs must be monitored.
5. Development-only npm audit findings remain and need a separately scoped toolchain update rather than an unrelated forced dependency upgrade.

## Go / no-go

**GO for a controlled maintenance-window runtime upgrade**, conditional on all VPS steps above passing. **NO-GO for an unattended update** and **NO-GO for claiming complete regression green** until the Linux native-module/preflight checks pass and the two pre-existing chart test assertions are reconciled in their own scope.
