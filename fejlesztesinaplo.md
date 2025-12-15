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

Nap: 2025. december 15.
Cím: CI workflow és API fejlesztés

Elkészült feladatok:

GitHub Actions CI workflow létrehozása (.github/workflows/ci.yml).

Automatizált depcheck, lint és build futtatás minden push/pull request után.

Node.js környezet cache‑eléssel a gyorsabb futásért.

API /trends endpoint frissítése:

A lekérdezés most már visszaadja a category mezőt.

Beépítettük a kategória szűrést (WHERE t.category IN (...)).

Eltávolítottuk a LIMIT‑et, így az adott időszakban előforduló összes kulcsszó megjelenik.

Frontend oldalon a TrendsList.tsx szűrési logikája most már helyesen működik a category mezővel.

Eredmény:

A projekt mostantól automatikusan ellenőrzött minden commitnál.

Hibás build vagy lint hiba nem kerülhet be a main branch‑be.

A felhasználó bármely kategóriára szűrhet, és az adott időszakban előforduló összes kulcsszót látja.

Az analitikai platform pontosabb képet ad a trendekről.

Hibák?:

SQL ONLY_FULL_GROUP_BY mód miatt kezdetben hibát dobott a GROUP BY használat.

Javítva: GROUP BY t.keyword, t.category vagy MAX(t.category) megoldással.

Terv (előző napból):

Grafikon modul hozzáadása → nem valósult meg.

Hibakezelés API hívásokhoz → részben, az SQL hibát kezeltük.

README bővítése telepítési instrukciókkal → nem valósult meg.

Automatizált tesztelés bevezetése → nem valósult meg.