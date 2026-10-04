# SEO és megosztás

## Hatókör

Title, description, canonical, robots, sitemap, nyelv, favicon, NewsArticle structured data, OpenGraph és Twitter/X kártyák.

## Acceptance

Csak ténylegesen létező adat kerül meta- és structured-data mezőbe; hiányzó kép vagy dátum nem eredményez hibás URL-t vagy `undefined` értéket.

## V2.1 végső ellenőrzés – 2026-10-04

- `V21-SEO-F001` **FIXED**: a root metadata korábban hardcoded production URL-t és nem létező `/og-image.png` képet használt. A canonical base most `NEXT_PUBLIC_APP_URL`, a megosztási kép a repositoryban ténylegesen létező `/utom.png`.
- `V21-SEO-F002` **FIXED**: hiányzott a Next.js `robots.txt` és `sitemap.xml` route. A sitemap a nyilvános statikus oldalakat és a tényleges `summaries.id` rekordokat adja, az operációs/auth útvonalakat a robots szabály tiltja.
- `V21-SEO-F003` **FIXED**: az article route nem adott adatból képzett page metadata-t és JSON-LD-t. Az article layout most csak létező summary title/content/date értékből készít metadata/`NewsArticle` projectiont; hiányzó adatnál noindex és nincs kitalált author/image.
- Localhost render smoke: `/`, `/premium`, `/cikk/1`, `/robots.txt`, `/sitemap.xml` mind 200; production/staging URL-hez a `NEXT_PUBLIC_APP_URL` explicit beállítása szükséges.

## Státusz

`PASS – SEO METADATA, ROBOTS, SITEMAP, ARTICLE STRUCTURED DATA`
