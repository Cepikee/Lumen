# Utom.hu A2 – helyi adatbázis-migrációs alap

**Állapot:** a migrációs keret és az első `sources` tábla megírva, MySQL 8-on még NEM futtatva. Ez nem teljes adatbázis-helyreállítás. A régi éles adatbázis sémája és adatai nem állnak rendelkezésre. A meglevő API-k továbbra is több örökölt mezőt és fix `source_id` értéket várnak; ezekhez még adapter és további migráció kell.

## Mi készült el?

- `db/migration-core.cjs`: sorszámozott SQL migrációk, SHA-256 checksum, `schema_migrations` nyilvántartás, MySQL advisory lock és második futáskor idempotens ellenőrzés.
- `db/migrate.cjs`: alapértelmezett, adatbázis-kapcsolat nélküli `--plan`, és csak kifejezett `--apply` parancsra helyi migráció.
- `db/migrations/001_sources.sql`: új, kezdetben üres forrástábla stabil `slug` azonosítóval. Nem tartalmaz valós híreket, URL-eket vagy üzemeltetési titkokat; a további táblák külön migrációkként következnek.
- `tests/unit/migration-core.test.cjs`: determinisztikus fájlfelderítés, céladatbázis-védelem, ismételt futás, checksum-eltérés és hibás DDL szimulált tesztje.

## Biztonságos, adatbázis nélküli próba

```powershell
npm.cmd run db:plan
npm.cmd run test:offline
```

A `db:plan` **nem kapcsolódik adatbázishoz**, nem hoz létre táblát és nem módosít meglévő adatot. A migrációs parancs nem része az alkalmazásindításnak vagy a Next buildnek.

## Későbbi valódi MySQL 8 integrációs próba (külön jóváhagyással)

1. Telepíts MySQL 8-at helyben, és hozz létre egy teljesen **üres**, kizárólag tesztcélú, `utom_local_dev` nevű adatbázist és csak ehhez jogosult külön migrációs felhasználót. Ne használd a régi `projekt2025` adatbázist vagy a root fiókot.
2. PowerShellben az adott terminálfolyamathoz állítsd be a `UTOM_OFFLINE_MODE=true`, `DB_MIGRATION_ENABLED=true`, `DB_HOST=127.0.0.1`, `DB_NAME=utom_local_dev`, `DB_USER`, `DB_PASSWORD` környezeti változókat. A jelszót ne írd be megosztott naplóba vagy Gitbe. A CLI nem tölti be automatikusan a `.env` fájlokat.
3. Kifejezett tesztengedély után futtasd: `npm.cmd run db:migrate:local`. A második futásnak `No changes` eredményt kell adnia.
4. Ellenőrizd olvasási módban a `sources` és `schema_migrations` táblát, a checksumot és a táblák sémáját.

**Korlát:** a MySQL DDL nem teljesen tranzakcionális a nyilvántartó tábla írásával. Ha a DDL sikerül, de a checksum-bejegyzés írása elbukik, a következő futás hibázik. Ilyenkor ne töröld automatikusan a táblát: ellenőrizd a részleges állapotot, és csak kézi felülvizsgálat után javítsd. A runner nem tartalmaz `DROP`, `DELETE`, adatbázis-reset vagy automatikus rollback műveletet.

**Következő feladat:** a MySQL 8 integrációs teszt, majd az `articles` migráció kidolgozása a tényleges cikkmezők és időbélyegek adapterével. A régi `source_id` hardcode-okat ekkor külön fel kell számolni, nem szabad véletlenszerű új ID-kre támaszkodni.
