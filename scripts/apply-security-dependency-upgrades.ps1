$ErrorActionPreference = "Stop"

Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Host "Updating security-sensitive dependencies..."
npm install --save-exact next@16.4.2 nodemailer@10.0.14 undici@7.30.1
npm install --save-dev --save-exact eslint-config-next@16.4.2

Write-Host "Running validation..."
npm run typecheck
npm run lint
npm run check:imports
npm run test:offline
npm run build
npm audit --omit=dev

Write-Host "Security dependency upgrade and validation complete."
