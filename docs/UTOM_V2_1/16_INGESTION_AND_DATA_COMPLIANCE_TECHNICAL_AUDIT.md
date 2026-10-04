# UTOM V2.1 – Ingestion és adatkezelés technikai audit

Dátum: 2026-10-04
Branch: `develop/utom-recovery`
Schema: `059`

> **EZ TECHNIKAI AUDIT, NEM JOGI SZAKVÉLEMÉNY.**

## Hatókör

A dokumentum a repository tényleges kódviselkedését írja le. Nem ad jogi, szerzői jogi, adatvédelmi vagy TDM-megfelelőségi minősítést, és nem módosít retention policyt owner döntés nélkül.

## Ingestion útvonal

- Az RSS feldolgozás szerveroldali, belső worker-tokenhez kötött `POST /api/fetch-feed` útvonalon történik. A böngészőből indított GET 405 választ kap.
- A feed URL-ek canonicalizálása eltávolítja a tracking paramétereket, és az ingestion envelope SHA-256 URL identityt képez.
- A `lib/safe-fetch.js` csak HTTP/HTTPS célpontot enged, DNS-t rögzít, redirectet korlátoz, válaszméretet és timeoutot korlátoz, valamint belső címeket tilt.
- A 444 útvonal külső proxyra támaszkodik, ezért továbbra is `THIRD-PARTY / PROXY – HOLD`; nem canonical production feed.
- Paywall megkerülésére külön kódút nem azonosítható. A fetch réteg normál HTTP/RSS/HTML letöltést végez, hitelesítési cookie-t vagy paywall-hozzáférést nem kezel.

## Tárolt tartalom és megjelenítés

### `articles.content_text`

- A mező `LONGTEXT`, és a scraper a megtisztított külső oldalszöveget ide írhatja.
- Pipeline feldolgozás használja: rövid/hosszú összefoglaló, kategória, kulcsszó, sentiment, clickbait, embedding és plágium-ellenőrzés.
- A repositoryban nem találtam automatikus TTL-t, törlési jobot vagy dokumentált retention határidőt erre a mezőre.
- A public `/api/summaries` és az article UI a `summaries.content` és `summaries.detailed_content` mezőket adja vissza; az `articles.content_text` közvetlenül nem jelenik meg a public feedben.
- A Premium category Insights útvonal legfeljebb 300 karakteres `excerpt` mezőt képezhet `content_text`-ből. Ez rövid, védett felhasználói részlet, nem teljes cikkpublikáció.
- Következtetés: teljes eredeti szöveg technikailag tárolódhat a belső `articles.content_text` mezőben; ezt owner által jóváhagyott retention policy nélkül nem módosítottam.

### Összefoglalók

- A `summaries.content` és `summaries.detailed_content` AI/alkalmazási összefoglaló mezők.
- A forrás URL és a forrásnév a summary/article kapcsolaton keresztül megmarad.
- A public article nézet a külső forrás URL-jére linkel, és nem a raw `content_text` mezőt rendereli.

## Provenance és evidence

A V2 provenance rekord tartalmazhatja az article ID-t, URL identityt, canonical URL-t, source ID/key értéket, publication time-ot, publication-time source-ot, observed/request/run/operation azonosítót, normalization verziót és státuszt. A claim/entity evidence spanok strukturált, korlátozott mezőkben kerülnek tárolásra; a V2 route-ok csak a szükséges projectiont adják vissza.

## Source policy állapot

| Terület | Tényleges állapot |
|---|---|
| Publisher evidence | source ID, source key/name és canonical URL tárolható |
| Ingestion mode | RSS envelope/provenance és pipeline útvonal külön azonosítható |
| Raw content | `articles.content_text` belső mezőben lehet teljes letöltött szöveg |
| Full-text fetch | normál forrásoknál scraper engedélyezett; 444 esetén RSS content használat, Origo esetén nincs rendes RSS cikktext |
| Paywall | bypass mechanizmus nem azonosítható; valódi paywall teszt nem történt |
| 444 | `THIRD-PARTY / PROXY – HOLD` |

## Személyes jellegű technikai adat inventory

- **Személy entity:** `v2_entities` személy típusú canonical/provisional entityket és neveket tárolhat.
- **Public figure megkülönböztetés:** a jelenlegi entity modellben külön, jogi értelemben vett public-figure flag nem bizonyított.
- **Claim/relation/event:** állítások, kapcsolatok, események, időbeli és evidence adatok személyhez kapcsolhatók.
- **Source provenance:** külső URL, source identity, publication time és ingestion audit tárolható.
- **User account:** email, jelszó hash, session, premium állapot és avatar/frame adatok kezelhetők.
- **Logs:** worker, feed, reset, recovery és operational logok technikai azonosítókat és hibákat tartalmazhatnak; secret-redaction az operations útvonalon aktív.
- **Reset/email/session:** reset token lifecycle, email outbox és user session táblák léteznek; ezek auth-only flow-k.

## Megállapítások és owner review

- **V21-DATA-F001 – Full-text retention nincs technikailag meghatározva.** A teljes szöveg tárolása lehetséges, de a repositoryban nincs bizonyított TTL vagy törlési politika. Ez policy/owner review tétel, nem automatikusan javítható kódhiba.
- **V21-DATA-F002 – 444 proxy függőség.** A 444 feed canonical production használata tudatosan HOLD állapotban marad; nem kódhiba.
- **V21-DATA-F003 – Paywall/TDM jogi minősítés.** A kód technikai bypass mechanizmust nem tartalmaz, de a forrásonkénti jogi/policy engedélyezés külső owner döntés.

## Státusz

`TECHNICAL AUDIT COMPLETE – OWNER REVIEW REQUIRED FOR RETENTION/SOURCE POLICY`

Production adatbázis, payment, paid AI és production deploy nem érintett.
