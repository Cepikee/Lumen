# V2 Intelligence Demo Showcase

## Cél

A `/dev/v2-demo` oldal a meglévő háromforrásos demo fixture valódi adatbázis- és V2 read-model állapotát mutatja meg tulajdonosi és mérnöki nézetben.

Az oldal nem új intelligence pipeline és nem második seed-rendszer. A meglévő `scripts/dev-demo-bootstrap.cjs` tölti fel a kontrollált, saját készítésű fixture-t.

## Indítás localhoston

1. Indíts egy üres vagy lokális `utom_dev` adatbázist, majd futtasd a migration chain-t `001→060`.
2. Állítsd be a loopback DB változókat és az explicit demo flaget:

```text
DB_HOST=127.0.0.1
DB_NAME=utom_dev
UTOM_DEV_DEMO_BOOTSTRAP=true
UTOM_V2_DEMO_ENABLED=true
```

3. Demo reset/seed:

```text
node scripts/dev-demo-bootstrap.cjs
```

4. Indítsd a lokális Next.js alkalmazást, majd nyisd meg:

`http://127.0.0.1:3000/dev/v2-demo`

Az oldal megnyitása nem indít purge-ot, nem ír adatot, és nem futtat fizetős AI- vagy payment-hívást.

## Demo állapot

Három saját készítésű forrás jelenik meg:

- Telex-szerű fixture;
- 24.hu-szerű fixture;
- Index-szerű fixture.

A kontrollált esemény ugyanazokat a szereplőket, helyszíneket és időpontokat használja, miközben a költségvetési állítás szándékosan eltérő: 120 millió, 150 millió, illetve nem közölt összeg. A demo nem választ automatikus győztest.

Demo felhasználói állapotok:

- Anonymous;
- Free (`demo-free`);
- Active Premium (`demo-premium`);
- Expired Premium (`demo-expired`).

A Premium megjelenítés a meglévő entitlement szabályt használja; a selector szerveroldali demo usert választ, nem frontend-only jogosultságot szimulál.

## Panelek

- **Nyers cikkek:** forrás, cím, dátum, canonical URL és teljes saját fixture-szöveg.
- **Megértés:** entityk, státuszok, evidence, olvasható kapcsolatok és claim-ek.
- **Forrás-összevetés:** közös, source-only, hiányzó és konfliktusos állítások.
- **Idővonal + graph:** valódi V2 timeline itemek és relation state.
- **Pipeline trace:** az ingest → read-model lánc input/output számai.
- **Olvasói nézet:** Free és entitlement-függő Premium preview.
- **Expected vs actual:** acceptance-számlálók és adatbázis-countok.
- **Raw retention:** jelenlegi raw állapot és a 24 órás/7 napos policy; az oldal nem töröl automatikusan.

Az alapértelmezett nézet az Owner mode. Az Engineering mode azonosítókat, confidence értékeket és szerződésközeli részleteket is megmutat.

## Guardok

Az oldal és az API csak akkor érhető el, ha mindez teljesül:

- explicit `UTOM_V2_DEMO_ENABLED=true`;
- nem production futás;
- a kérés loopback hostról érkezik;
- `DB_HOST` loopback;
- `DB_NAME=utom_dev`.

Más környezetben az oldal és az API 404-et ad. A route nem szerepel a sitemapben és robots által indexelhető publikus útvonalként sincs engedélyezve.

## Hibaállapotok

Hiányzó demo adatbázis vagy hiányos fixture esetén az API biztonságos, rövid hibát ad; a UI nem renderel hibás vagy részleges objektumot tömbként. A lekérdezés `Cache-Control: no-store` választ használ, és raw szöveget nem ír konzolba vagy logba.
