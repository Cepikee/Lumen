# Premium UX

## Terméküzenet

Free: „Mi történt?” Premium: „Mi van mögötte?”. A meglévő context, timeline, source comparison, conflict, attribution és történeti funkciókból építkezünk.

## Korlátok

Stripe, Barion, payment, AI chat, quota és Premium+ ebben a programban nem implementálandó. A nem elérhető művelet maradjon őszintén letiltva.

## Státusz

`PASS` – anonymous/free/active/expired entitlement matrix és provider nélküli disabled action állapot Chrome-ban ellenőrizve.
# Premium localhost acceptance checkpoint – 2026-10-04

- Demo Premium login session létrejön és HTTP localhoston visszaolvasható (`/api/auth/me` `loggedIn=true`).
- A legacy Premium insights proxy szándékosan `503 insights_unavailable`, ha nincs explicit belső API-kulcs; a kör nem talál ki kamu kulcsot vagy fizetési flow-t.
- A V2 Premium route-ok böngészőből ugyan-origin kéréssel tesztelendők; közvetlen kulcs nélküli script-kérés 401, ami a route szerződésének része.

## Browser entitlement matrix – 2026-10-04

A valódi Chrome session matrix négy állapotot bizonyított:

- anonymous: Insights és V2 Premium panel zárolt, 401/403 entitlement válaszok felhasználói állapotként jelennek meg.
- free: sikeres login után is zárolt Premium tartalom, premium statisztika nem jelenik meg.
- active Premium: Insights statisztikák, category Insights és article intelligence renderel; active futásban failed request 0.
- expired Premium: lejárt `premium_until` után a korábbi aktív állapot nem marad a DOM-ban; Insights zárolt és premium statisztika nélküli.

A subscription/support gombok provider nélkül szándékosan `Jelenleg nem elérhető` állapotúak.
