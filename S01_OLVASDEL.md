# S-01 – bejelentkezési munkamenet javítása

1. A meglévő `utom_dev` adatbázisba egyszer importáld a `db/S01_user_sessions.sql` fájlt (a régi 21 tábla változatlan marad, egy új `user_sessions` táblát kap).
2. Másold a csomagban levő `Lumen/` fájlokat a helyi `F:\Projekt2025\Lumen` mappába a mappaszerkezet megőrzésével.
3. Indítsd újra a `npm.cmd run dev` szervert. A korábbi bejelentkezési sütik érvénytelenek, jelentkezz be újra.
4. Futtasd: `npm.cmd run check`.
5. A `session_user=1` vagy más számszerű sütinek most minden érintett profil-API-n bejelentkezés nélküli állapotot kell adnia.

**Határ:** az S-01-et célozza. A Codex többi auditpontja (pl. S-02 nyilvános műveleti API-k) nincs ezzel kész. A videó debug-cookie megkerülését az S-01 védelem miatt letiltottuk, de a teljes S-06 audit külön feladat. Éles üzemben még nem teszteltük; a SQL-t a te helyi MySQL-eden kell lefuttatni.
