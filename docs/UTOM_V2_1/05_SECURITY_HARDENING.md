# Biztonsági hardening

## Hatókör

CSP, HSTS, cookie- és session-szabályok, CSRF, rate limit, SSRF, SQL injection, XSS, open redirect, path traversal, input/body limit, admin/internal route, worker token, secret leakage és reverse proxy header kezelés.

## Production határ

Localhost adapter csak explicit development/test módban engedélyezhető; productionben minden határ fail-closed marad. Frontend flag, localStorage vagy query paraméter nem adhat Premium hozzáférést.

## Státusz

`NOT STARTED` – külön security hardening projekt nélkül, csak V2.1 működési findingok alapján.
