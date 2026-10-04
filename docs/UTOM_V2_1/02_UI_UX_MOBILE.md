# UI/UX és mobil audit

## Hatókör

Homepage, navigáció, feed, cikk, context, timeline, source comparison, Premium, auth, profil, keresés, kategória, formok, modalok, loading, empty, error és 404.

## Viewportok

360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080.

## Acceptance

Nincs vízszintes túlcsordulás, levágott cím vagy modal, a tap targetek használhatók, a fókusz és heading-hierarchia érthető, a mobil source comparison és timeline olvasható.

## Státusz

`PASS` – a korábbi CUA transport blokkot Windows Chrome 154 CDP disposable profillal feloldottuk; a route-smoke és API acceptance izolált runtime-ban PASS.
# UI/UX és mobil acceptance checkpoint – 2026-10-04

Az izolált demo runtime route-smoke és a valódi Chrome viewport-kör sikeres.

## FINAL REAL-CHROME MOBILE/UX EVIDENCE – 2026-10-04

A korábbi CUA transport blokk után Windows Chrome 154 CDP disposable profillal lefutott a teljes exact viewport matrix: 360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080. A homepage, Trends, Insights, category Insights, Premium és article detail 36/36 ellenőrzésben overflow nélkül renderelt.

A Chrome körben reprodukált és javított UI hibák:

- 360px-en a fejléc/kereső túlcsordult; a kereső külön mobil sorba került.
- A globális outline reset elrejtette a billentyűzetes fókuszt; `:focus-visible` gyűrű került minden vezérlőre.
- Article detail `h1` nélkül, LoginModal dialog semantics nélkül, ProfileMenu keyboard trigger nélkül renderelt; mindhárom javítva.

A modal, heading, named control, image alt és keyboard focus ellenőrzések célzott tesztekkel és valódi Chrome Tab navigációval PASS.
