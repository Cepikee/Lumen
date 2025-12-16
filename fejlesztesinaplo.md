Nap: 2025. december 1.
Cím: V1.0 – Alap projekt dokumentáció

Elkészült feladatok:

Projekt inicializálása React + Next.js alapokon.

Alap szerkezet kialakítása: app/, lib/, konfigurációs fájlok.

Globális stílusok (globals.css) hozzáadása.

GitHub repo létrehozása, .gitignore beállítása.

Eredmény:

Az első stabil verzió elkészült, lefektetve az alapokat.

A projekt futtatható, alap layout és kezdőoldal működik.

Hibák?:

Nem volt jelentős hiba, csak kisebb konfigurációs finomítások.

Terv (előző napból):

Nincs, mivel ez volt az első nap.

# Fejlesztési napló – 2025-12-15

## Mai feladatok
- `categorize-null` route.ts elkészítése és futtatása.
- Kategóriák újrakiosztása (Politika, Sport, Gazdaság, Tech).
- Frontend `TrendsFilters` és `TrendsPanel` komponensek tesztelése.

## Eredmények
- Az adatbázisban a kategóriák sikeresen NULL-ra állítva, majd újrakategorizálva.
- SQL ellenőrzés: `SELECT keyword, category, frequency ...` visszaadja a megfelelő sorokat.
- Git commit készült a mai változtatásokról.

## Hibák / Kritikus problémák
- **Szűrős megjelenítés továbbra sem működik.**
  - Frontend `filters.categories` tömböt küldi, de a backend route nem jól kezeli az SQL paraméterezést.
  - A frontend `Trend` interface `freq` mezőt vár, míg az adatbázisban `frequency` van → mezőnév eltérés.
- A `route.ts` futása beragadt, kézzel kellett leállítani (Ctrl+C).
- Ez **kritikusan fontos hiba**, mert a szűrők nélkül a felhasználói élmény sérül. Holnap első feladat: backend `/api/trends` route javítása (categories tömb kezelése + frequency alias).

## Holnapi teendők
- `/api/trends` route javítása:
  - `filters.categories` → SQL `IN (...)` helyes paraméterezés.
  - `frequency AS freq` alias, hogy a frontend változatlanul működjön.
- Frontend ellenőrzés: `TrendsPanel` helyesen jelenítse meg a kategóriákat és gyakoriságot.
- Tesztelés: szűrők (forrás, kategória, időszak) működjenek együtt.

# 📓 Fejlesztési napló – 2025.12.16.

## Mai feladatok és javítások

- **Import hibák javítása**
  - A `TrendsSection.tsx` helytelenül `@/TrendsPanel`‑t importált → átírva `@/components/TrendsPanel`.

- **Props típusütközés megoldása**
  - A `TrendsPanel` csak `filters` propot várt, de a `TrendsSection` és `page.tsx` extra propokat (`trendExpanded`, `setTrendExpanded`) adtak át.
  - Egyszerűsítés: töröltük a felesleges propokat a `TrendsSection` és `page.tsx` hívásokból → így a `TrendsPanel` maradhatott az eredeti definícióval.

- **Szintaktikai hiba javítása**
  - A `useState<string | null>(null)` sorban hiányzott a zárójel és pontosvessző → javítva `useState<string | null>(null);`.

- **SpikeBadge logika tisztázása**
  - Az API‑ból jövő `growth` érték sokszor `0` volt → Index 1.
  - Megbeszélve, hogy a jövőben a `growth` értéket a history alapján kell számolni, így a Spike Index újra helyesen tükrözi a trendek növekedését.

- **Build és futtatás**
  - A hibák kijavítása után a projekt sikeresen buildelhető és futtatható.
  - A `TrendsPanel` megjeleníti a trendeket, sparkline‑okat és a SpikeBadge indexeket.

---

## Eredmény
övid összefoglaló
Kritikus hiba: a cron.js fájlban található summarize-all folyamat csak egyszer hívódik meg a cron végén, ahelyett hogy folyamatosan, ciklusban fusson. Ennek következménye, hogy a rendszer túl sok adatot tölt újra, redundáns feldolgozást okoz, és nem skálázódik jól. A 7 napos és 30 napos nézetek közti viselkedés pontatlan: a 30 napos nézet megjelenhet, miközben a 7 napos nézet nincs megbízhatóan feltöltve.

Jelenlegi viselkedés és reprodukció
A cron feladat lefut, végigmegy a feldolgozási lépéseken, majd egyszer meghívja a summarize-all rutint.

summarize-all egyszeri futása nem biztosít folyamatos feldolgozást; új adatok a cron futása után nem kerülnek azonnal összegzésre.

A frontend emiatt néha mutat 30 napos találatot, miközben a 7 napos nézet hiányos, mert a frissítések nem inkrementálisan, hanem tömegesen és ritkán történnek.

Reprodukció: új cikk beszúrása után a modal nem jeleníti meg azonnal a cikket; csak a következő cron futáskor, és csak akkor, ha a summarize-all lefutott.

Gyökérok
Egyszeri hívás logika: summarize-all csak a cron végén fut, nem ciklikusan.

Nincs inkrementális feldolgozás: minden futásnál sok rekordot újra feldolgozunk ahelyett, hogy csak az újat vagy a változottakat kezelnénk.

Hiányzó státusz vagy queue mechanizmus: nincs megbízható jelölés arra, hogy mely rekordok vannak feldolgozva, melyek várnak.

Túl nagy batch méretek és párhuzamosság hiánya: egyszerre túl sok adatot próbálunk kezelni, ami lassít és redundanciát okoz.

Cache és deduplikáció hiánya: a frontend és backend cache nincs összehangolva, emiatt felesleges újratöltések történnek.

Azonnali javítási javaslatok
Ciklusos feldolgozás: módosítsuk a cron.js-t úgy, hogy a summarize-all folyamatosan fusson ciklusban, kis várakozásokkal a ciklusok között, ne csak egyszer a végén.

Batch és limitálás: dolgozzunk kisebb batch-ekkel (például 100 rekord per iteráció) és használjunk offset vagy cursor alapú lapozást.

Feldolgozási státusz: vezessünk be processing_status mezőt a rekordoknál (pending, in_progress, done, failed) és használjunk tranzakciókat az állapotváltásoknál.

Idempotencia: biztosítsuk, hogy a summarizálás idempotens legyen, így újrahívás esetén nem lesz duplikáció.

Retry és backoff: hibakezelésnél alkalmazzunk exponential backoffot és max retry számot.

Logging és metrikák: részletes logolás minden batchről, időtartamokról, hibákról, és alap metrikák gyűjtése (processed/sec, failures, queue length).