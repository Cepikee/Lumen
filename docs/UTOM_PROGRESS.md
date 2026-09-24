# Utom.hu – helyreállítási progress napló

Utolsó frissítés: 2026-09-24  
Aktuális fázis: **A1 fejlesztési szakasz elkészült; az A mérföldkő nincs lezárva**  
Aktuális helyi branch: `develop/utom-recovery`  
Aktuális commit: `7df3f0792715f513f1293277b97095dcbbf89ce4` (új commit nem készült)

## A1-ben elkészült

- Node 24 rögzítése `.nvmrc` és `package.json#engines` segítségével.
- Egységes `typecheck`, `lint`, `check:imports`, `test:offline`, `build` és összefogó `check` npm scriptek.
- Biztonságos `.env.example`; offline mód, mock AI és minden költséges vagy írható képesség tiltott alapértéke.
- Központi, fail-closed futásidejű konfiguráció és capability guard.
- Determinisztikus mock AI rövid/hosszú összefoglalóhoz, kategóriához, kulcsszavakhoz, clickbait-válaszhoz és hibás válaszhoz. A mock tartalom tesztadatként jelölt.
- A pipeline OpenAI kliensének lusta, konfigurációvezérelt adapterre cserélése. Offline módban OpenAI-kliens sem jön létre.
- Feed/elemző/összefoglaló route-ok offline blokkolása; SMTP küldés explicit engedélyhez kötése.
- Az importkor automatikusan induló cron/worker belépési pontok explicit indítás mögé helyezése.
- Nyolc hibás legacy importútvonal javítása és automatikus helyiimport-ellenőrző hozzáadása.
- Next 16 build akadályainak javítása: a no-op webpack blokk eltávolítása, impresszum CSS útvonal javítása, a DB-t olvasó híradó oldal dinamikussá tétele.

## Ténylegesen módosított vagy létrehozott fájlok

- Alapkonfiguráció: `.nvmrc`, `.env.example`, `.gitignore`, `package.json`, `eslint.config.mjs`, `next.config.ts`.
- Offline konfiguráció és AI: `lib/config/runtime.js`, `lib/config/runtime.d.ts`, `lib/config/routeGuard.ts`, `lib/ai/mockAi.js`, `lib/ai/client.js`, `pipeline/aiClient.js`.
- Külső műveletek védelme: `lib/mailer.ts`, `app/api/analyze/route.ts`, `app/api/fetch-feed/route.ts`, `app/api/summarize/route.ts`, `app/api/summarize-all/route.ts`.
- Háttérfolyamatok leválasztása: `app/middleware.ts`, `lib/serverInit.ts`, `lib/cron.ts`, `lib/cron.js`, `lib/trend-cron.js`, `pipeline/cron.js`, `forecast/forecast.js`, `autohirek/index.js`.
- Buildjavítások: `app/hirado/page.tsx`, `app/impresszum/page.tsx`.
- Ellenőrzések: `scripts/check-local-imports.cjs`, `tests/unit/runtime-config.test.cjs`, `tests/unit/mock-ai.test.cjs`, `tests/unit/ai-client-offline.test.cjs`.
- Dokumentáció: `docs/UTOM_PROGRESS.md`; a korábban létrehozott audit- és helyreállítási dokumentumok változatlanul megmaradtak.

## Ellenőrzések

| Ellenőrzés | Eredmény |
|---|---|
| `node --version` | `v24.19.0` |
| `npm --version` | `11.17.0` |
| `npm ci` | sikeres, 829 csomag települt |
| `npm run typecheck` | sikeres |
| `npm run lint` | sikeres, 0 hiba és 404 örökölt figyelmeztetés |
| `npm run check:imports` | sikeres; minden statikusan felismerhető helyi import feloldható |
| `npm run test:offline` | 6/6 sikeres; külső hálózati hívás nem történt |
| `npm run build` | sikeres offline alapértékekkel; 71 statikus oldal elkészült, a dinamikus route-ok felépültek |
| `npm run check` | teljes ellenőrzési lánc sikeres |
| `npm audit` (`npm ci` részeként) | 46 jelzés: 5 critical, 18 high, 22 moderate, 1 low |
| Git branch/HEAD | `develop/utom-recovery`, HEAD és `main` változatlanul `7df3f079...` |
| Távoli Git-művelet | nem történt |
| Adatbázis-újraépítés vagy migráció | nem történt |

## Ismert korlátok és következő munka

- Az ESLint jelenleg 404 örökölt figyelmeztetést mutat. A korábban hibaként jelentett legacy `any`, CommonJS és React 19 szabálytalanságokat A1-ben látható figyelmeztetéssé minősítettük; ezek fokozatos javítása külön munkacsomag.
- A dependency audit 46 sérülékenységét célzottan kell feloldani. Automatikus, törő főverzió-frissítés nem történt.
- Több régi modul továbbra is beégetett DB-konfigurációt és közvetlen Ollama/OpenAI integrációt tartalmaz. Az aktív A1 belépési pontok védettek, a teljes adapteres migráció az A mérföldkő további része.
- A verziózott adatbázisséma, migrációs rendszer, auth/admin hardening, teljes route-szintű írásvédelem és egységes CI workflow még hátravan.
- WSL2 tiszta környezetben külön reprodukció még nem történt; a mostani ellenőrzés Windows/PowerShell alatt futott.

## Következő konkrét fejlesztési feladat

**A2 – adatbázis-séma és migrációs alap:** a jelenlegi táblák és lekérdezések összevetése, verziózott kezdeti séma/migráció létrehozása, üres helyi adatbázison determinisztikus migrációs teszt. Ez csak külön következő munkacsomagban indul; A1 nem építette újra az adatbázist.

## Commitnapló

Új commit nem készült. Az A1 változások, a korábbi audit és a helyreállítási dokumentumok helyi working tree-ben vannak; `main` nem módosult, push/fetch/pull/PR nem történt.
