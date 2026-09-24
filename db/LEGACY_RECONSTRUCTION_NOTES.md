# Utom.hu — az eredeti forráskódhoz igazított adatbázis-rekonstrukció

**Céladatbázis: kizárólag a már létrehozott `utom_dev`. NEM készül új nevű adatbázis.**

## Mit kapunk?
A régi forráskód SQL-író és -olvasó műveleteiből rekonstruált, 21 alkalmazástáblát tartalmazó teljes sémát. Ezen kívül a migrációs rendszer `schema_migrations` technikai táblát vezet. A `sources` meglévő 001-es A2 migrációja változatlan; a további 20 tábla 002–021 migrációként szerepel. Megmaradnak a régi kódban szereplő oszlopnevek (`summaries.content` ÉS `summary_text`, `users.pin_code`, `password_reset_tokens.userId`, stb.).

A `UTOM_TELJES_REKONSTRUALT_ADATBAZIS.sql` azonos tartalmú, egyben olvasható SQL-séma, **alternatív referenciapéldány**. Ne futtasd ezt ÉS a migrációkat is ugyanarra az adatbázisra, mert az A2 migrációs nyilvántartás nem tudná követni a kézi importot. A `CREATE TABLE IF NOT EXISTS` sem ellenőrzi, hogy egy már létező tábla szerkezete egyezik-e.

## FONTOS: mi igazolt és mi nem?
A táblák és számos oszlop konkrét SQL-használattal alátámasztottak. Az elveszett eredeti adatbázis tábladeklarációinak minden `NULL`, típus, index, constraint és default részlete nem állítható helyre pusztán a kódból; a mellékelt verzió ezért *kódkompatibilis rekonstrukciós javaslat*, nem az elveszett eredeti DDL bizonyított másolata. A teljes működés ellenőrzése MySQL-es migráció-, seed-, API- és frontend-integrációs tesztet igényel.

## Kód szintű, sémával NEM javítható ismert blokkolók
1. A jelenlegi `app/api/fetch-feed/route.ts`, `pipeline/saveSummary.js`, `forecast/forecast.js` és több más útvonal még `projekt2025` névvel és beégetett régi `root`/jelszó kapcsolattal működne. Ettől a `utom_dev` tábla létrehozása után sem fognak automatikusan működni. Az aktív útvonalakat külön kell a közös, titokmentes kapcsolódási konfigurációra átállítani.
2. A feldolgozás néha `summaries.content`, néha `summaries.summary_text` mezőt ír. Mindkettő szerepel a rekonstrukcióban, de a régi kód nem szinkronizálja őket. Ezt alkalmazáskódban kell egységesíteni.
3. A `published_at` jelenleg több helyen a begyűjtés idejét tárolja. A séma önmagában nem javítja az időadatok jelentését.
4. A korábbi auth cookie, PIN és védtelen API-k továbbra sem biztonságosak. A séma jelenléte nem engedélyezi a nyilvános indítást.
5. A források 1–7 azonosítója a régi kódban rögzített. Külön `db/legacy-sources-seed.sql` fájl mutatja a pontos kód szerinti megfeleltetést, de az élő RSS-t csak későbbi jóváhagyással szabad bekapcsolni.

## Helyi kipróbálás (AZONOS `utom_dev`, az eddigi adatbázis)
A migrációk csak már létező, üres `utom_dev` adatbázison vagy ugyanennek **szabályosan nyilvántartott korábbi A2 migrációs állapotán** futtathatók. Futtatásuk előtt olvasási módban ellenőrizd a `SHOW TABLES` kimenetét és készíts mentést, ha van benne adat. A futtató nem hoz létre/töröl adatbázist és nem fut a Next build közben.

1. `npm.cmd run db:plan` — adatbázis kapcsolat nélkül felsorolja a 21 migrációt.
2. `npm.cmd run check` — offline unit/type/lint/build; nem ellenőrzi az éles SQL lefutását.
3. A migrációs futtatás külön, **helyi MySQL-integrációs próba** legyen a meglévő `utom_dev` adatbázison, a saját migrációs felhasználóddal és explicit környezeti kapcsolókkal. Ne tegyél DB-jelszót Gitbe, parancssori argumentumba vagy a megosztott naplóba.
4. A `db/legacy-sources-seed.sql` kizárólag a 7 forrás ID-egyezését állítja elő; a migrációs futtató nem indítja el automatikusan.

**Nem igazolt:** a feltöltött környezetben nem érhető el MySQL-szerver, ezért a tényleges `CREATE TABLE` futtatását és a régi alkalmazás SQL-lekérdezéseinek DB-integrációs sikerét itt nem tudtam kipróbálni.
