# Premium UX

## Terméküzenet

Free: „Mi történt?” Premium: „Mi van mögötte?”. A meglévő context, timeline, source comparison, conflict, attribution és történeti funkciókból építkezünk.

## Korlátok

Stripe, Barion, payment, AI chat, quota és Premium+ ebben a programban nem implementálandó. A nem elérhető művelet maradjon őszintén letiltva.

## Státusz

`NOT STARTED`.
# Premium localhost acceptance checkpoint – 2026-10-04

- Demo Premium login session létrejön és HTTP localhoston visszaolvasható (`/api/auth/me` `loggedIn=true`).
- A legacy Premium insights proxy szándékosan `503 insights_unavailable`, ha nincs explicit belső API-kulcs; a kör nem talál ki kamu kulcsot vagy fizetési flow-t.
- A V2 Premium route-ok böngészőből ugyan-origin kéréssel tesztelendők; közvetlen kulcs nélküli script-kérés 401, ami a route szerződésének része.
