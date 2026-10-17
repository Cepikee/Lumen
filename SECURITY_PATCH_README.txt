UTOM security hardening overlay
===============================

After extracting this overlay over F:\\Projekt2025\\Lumen, run from PowerShell:

cd F:\\Projekt2025\\Lumen
powershell -ExecutionPolicy Bypass -File .\\scripts\\apply-security-dependency-upgrades.ps1

This updates and locks:
- next 16.4.2
- eslint-config-next 16.4.2
- undici 7.30.1
- nodemailer 10.0.14

Then inspect `git status` before committing.

Production notes:
- UTOM_TRUST_PROXY_HEADERS=true is required only when the public app/video server is behind a trusted reverse proxy that overwrites client-IP headers.
- video-server.js now binds to 127.0.0.1:3001 by default. Ensure nginx proxies the secure video route to this loopback service.
- /api/analyze is now internal-worker-only and requires the existing UTOM_INTERNAL_WORKER_TOKEN bearer authorization.
