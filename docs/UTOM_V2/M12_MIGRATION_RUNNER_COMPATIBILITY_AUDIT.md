# UTOM V2 – M1.2 Migration Runner Compatibility Audit

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)
Hatókör: audit és dokumentáció; V2 migration, alkalmazáskód és runtime nem készült.

## 1. Eredmény

`M1.2 COMPLETE: IGEN`

`MIGRATION RUNNER CHANGE REQUIRED: NEM`

`M1 IMPLEMENTATION BLOCKER: NINCS`

A jelenlegi runner a későbbi additive V2 migrationök futtatására alkalmas. A
következő migration verziója a repository jelenlegi szabályai alapján `034`,
elvárt fájlneve pedig `034_<lowercase_name>.sql`. Konkrét migrationt ebben a
körben nem készítettünk.

## 2. Inventory

| Terület | Tényleges fájl / függvény | Eredmény |
|---|---|---|
| Discovery és filename parsing | `db/migration-core.cjs` – `loadMigrations` | `^\\d{3}_[a-z0-9_-]+\\.sql$`, determinisztikus név szerinti rendezés |
| Version parsing | `loadMigrations` | első három számjegy; duplicate verzió elutasítva |
| SQL contract | `loadMigrations` | UTF-8, nem üres, egy támogatott DDL statement, `multipleStatements=false` |
| Chain audit | `auditMigrationChain` | 001-től folytonos sorszám, destructive SQL/index warning, InnoDB/utf8mb4 warning |
| Ledger/status | `getMigrationStatus` | `schema_migrations`, filename/checksum mismatch fail-closed, pending lista |
| Apply entrypoint | `db/migrate.cjs` – `main` | `--plan`, `--status`, `--apply`; céladatbázis-ellenőrzés |
| Apply engine | `applyMigrations` | MySQL advisory lock, soronkénti DDL és ledger insert, lock release `finally` ágban |
| Checksum | `crypto.createHash('sha256')` | a beolvasott, trimelt SQL (a teljes megmaradó kommenttartalommal) hash-e |
| Connection lifecycle | `db/migrate.cjs` | céladatbázis ellenőrzés, végül `connection.end()` |
| Runtime readiness | `lib/operations.js` – `checkSchemaReadiness` | jelenleg required schema `033`; V2-nél a kóddal összehangolt frissítés szükséges |
| Unit tests | `tests/unit/migration-core.test.cjs` | discovery, célvédelem, idempotencia, checksum, DDL-hiba |
| Integration tests | `tests/integration/mysql-pipeline-recovery.test.cjs` | fresh 001→033, 032→033 upgrade, idempotencia és schema/runtime invariánsok |

Az aktuális `db/migrations/` könyvtárban 33 fájl van: `001`–`033`, duplicate
verzió és hiányzó sorszám nincs. A tényleges legmagasabb verzió `033`.

## 3. Migration file contract

- A fájlnév háromjegyű, nullával kitöltött verzióból, kisbetűs névből és `.sql`
  kiterjesztésből áll.
- A runner fájlnév szerint rendez; háromjegyű verziók esetén ez a numerikus
  sorrenddel azonos.
- A fájl UTF-8-ként olvasódik. A záró whitespace és egyetlen záró semicolon
  eltávolításra kerül a futtatás előtt.
- Több statement nincs támogatva. A parser a teljes SQL-ben megmaradó belső
  semicolon esetén leáll; a teljes soros `--` kommenteket a statement-ellenőrzés
  előtt figyelmen kívül hagyja.
- `multipleStatements` explicit `false`.
- A jelenlegi láncban minden fájl egy `CREATE TABLE` vagy `ALTER TABLE`
  statementet tartalmaz, és a célzott audit szerint a single-statement szabály
  teljesül.
- A checksum SHA-256, és a már lefutott fájl tartalmának, fájlnevének vagy
  verziójának változása fail-closed hibát ad.
- Lefutott migrationt nem módosítunk; javítás mindig új migration.

## 4. Fresh install és upgrade

Fresh install esetén a discovery `001`–`033` sorrendben fut. Az integration
baseline szerint a teljes lánc tiszta MySQL 8 adatbázison PASS, a második futás
pedig üres végrehajtási listát ad.

Upgrade esetén az alkalmazott ledger soraihoz a runner előbb ellenőrzi a
filename/checksum egyezést, majd csak a hiányzó verziókat futtatja. A 032→033
upgrade baseline PASS, a korábbi sorok checksumai változatlanok maradnak.

Az első V2 migrationnek ugyanebbe a láncba kell illeszkednie: `034` után minden
új fájl monoton növekvő, háromjegyű verziót kap. V2 schema migration nem
végezhet article backfillt vagy nagy tömegű adatfeldolgozást.

## 5. Additive V2 és MySQL 8 kompatibilitás

A runner által végrehajtott egyetlen DDL statement képes új InnoDB táblára,
indexre, unique constraintre, foreign key-re, nullable vagy biztonságos
defaulttal rendelkező NOT NULL mezőre, valamint későbbi additive `ALTER TABLE`
műveletre. A jelenlegi migrationök ténylegesen használnak InnoDB-t,
`utf8mb4`-et, foreign key-ket és JSON mezőket, ezért ezek nem új, ismeretlen
runner-képességek MySQL 8.0.46 alatt.

A V2 migration szerződésének külön kell ellenőriznie az index-prefix hosszakat,
collationt és FK-k létrehozási sorrendjét. Ezek schema fixture és MySQL gate
feladatai, nem runner-módosítási igények.

## 6. Transaction, failure és concurrency semantics

Az advisory lock neve `utom:local:migrations`, timeoutja 10 másodperc. Két
runner ugyanazon MySQL szerveren nem futtatja párhuzamosan a láncot; a második
runner lock-hibával leáll. A lock kapcsolat-élettartamhoz kötött, és a
`finally` ág explicit felszabadítást kísérel meg.

MySQL DDL és a `schema_migrations` INSERT nem egy közös, teljesen
rollbackelhető tranzakció. A runner szándékosan csak sikeres DDL után ír ledger
sort. Ennek következményei:

| Eset | Jelenlegi viselkedés | Kezelés |
|---|---|---|
| Migration még nem futott | DDL, majd ledger INSERT | normál út |
| DDL hibázik | ledger sor nem készül | lock release, hibával leáll |
| DDL sikerül, ledger INSERT hibázik | schema és ledger eltérhet | kézi schema/ledger vizsgálat; automatikus retry tilos |
| Process crash DDL közben/után | MySQL DDL állapota maradhat | backupból vagy izolált restore-ból helyreállítás |
| Ledger szerint kész, schema eltér | checksum önmagában nem schema-diff | readiness/schema inspection állítsa meg a rolloutot |
| Checksum mismatch | futtatás fail-closed | új migration szükséges |

Ez a DDL-korlát a repository korábbi migration dokumentációjában és recovery
runbookjában már rögzített, ismert MySQL viselkedés. Nem új M1.2 runner
incompatibility, de minden V2 migration gate-nek számolnia kell vele:
backup, writer-stop, izolált ellenőrzés és kézi jóváhagyás szükséges; a runner
nem végez destruktív automatikus rollbacket.

## 7. Schema readiness és verzióstratégia

`lib/operations.js` jelenleg pontosan `033`-at tekint támogatott runtime
sémának, és egy újabb ismeretlen verziót `unsupported_schema_version` hibával
jelez. Ez helyes fail-closed viselkedés. A `034` migration bevezetésekor a
readiness-követelményt és a migrationt ugyanabban a koordinált release-ben kell
frissíteni; a migration önmagában nem teheti az alkalmazást üzemkésszé.

Ez nem M1.2 runner-módosítás, hanem az M1.5/M1.6 kompatibilitási és release
gate része. Ebben a körben `lib/operations.js` nem változott.

## 8. Future V2 checklist

A runner később létre tudja hozni az M1.1-ben befagyasztott additive struktúrák
DDL-jét, ha a konkrét migration:

- egyetlen, MySQL 8 által támogatott statement;
- InnoDB és utf8mb4 alapú;
- explicit nullable/FK/index/unique döntéseket tartalmaz;
- nem végez backfillt vagy legacy törlést;
- `034`-től folytonos névvel és immutable checksummal készül;
- failure után a dokumentált restore/inspection eljárást követi.

Ez lefedi az `entities`, `aliases`, `relations`, `claims`, `evidence`,
`events`, AI run audit metadata és version metadata jövőbeli tábláit. A táblák
konkrét definíciója az M1.3 schema contract fixture feladata.

## 9. Futtatott ellenőrzések

- `node --test tests/unit/migration-core.test.cjs tests/unit/operations.test.cjs` – **11/11 PASS**
- `npm run db:plan` – **PASS**, `count=33`, `latest=033`, `safe=true`
- Repository filename inventory – **33/33 érvényes**, duplicate/hiányzó verzió nincs
- Recovery baseline – fresh `001→033`, upgrade `032→033`, checksum és idempotencia **PASS**
- MySQL recovery baseline – **30/30 PASS**

## 10. Findingok

Új M1.2 runner finding: **0**.

A DDL/ledger külön commitjának korlátja ismert, dokumentált recovery policyval
kezelt állapot; nem minősült új blockernek és nem igényel runner-kódmódosítást
az első V2 migration előtt.

## 11. Milestone lezárás

`M1.2 COMPLETE: IGEN`

`MIGRATION RUNNER CHANGE REQUIRED: NEM`

`M1 IMPLEMENTATION BLOCKER: NINCS`

`NEXT STEP: M1.3 – V2 schema contract fixture`
