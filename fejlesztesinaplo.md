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
