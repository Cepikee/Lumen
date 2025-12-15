📖 V1.0 – Alap projekt dokumentáció
🔧 Projekt célja
React + Next.js alapú webalkalmazás.

Cél: analitikai platform fejlesztése, amely tanítja és segíti a felhasználót az adatok értelmezésében.

Ez az első stabil verzió, amely az alapokat lefekteti.

🗂 Projekt szerkezete
app/ mappa

layout.tsx: fő layout komponens, minden oldal kerete.

page.tsx: kezdőoldal, alap tartalom.

globals.css: globális stílusok.

lib/ mappa

.gitignore: belső könyvtárak kizárása.

Konfigurációs fájlok

next.config.ts: Next.js beállítások.

tsconfig.json: TypeScript konfiguráció.

eslint.config.mjs: lint szabályok.

Csomagkezelés

package.json: függőségek és script-ek.

package-lock.json: pontos verziók.

⚙️ Függőségek (dependencies)
React – komponens alapú UI.

Next.js – keretrendszer SSR/SSG támogatással.

TypeScript – típusbiztos fejlesztés.

ESLint – kódminőség ellenőrzés.

🎨 Funkciók ebben a verzióban
Alap layout és kezdőoldal.

Globális stílusok beállítása.

Projekt inicializálva GitHubra.

.gitignore beállítva (node_modules, build fájlok kizárva).

Alap fejlesztési workflow: git add → git commit → git push.

📝 Fejlesztési napló – V1.0
Initial commit: projekt inicializálása, alap fájlok feltöltése.

Struktúra kialakítása: app/, lib/, konfigurációs fájlok.

Stílusok: globális CSS hozzáadva.

GitHub integráció: repo létrehozva, privát beállítás.

🚀 Következő lépések (V1.1 tervek)
Új komponens: grafikon modul.

Hibakezelés API hívásokhoz.

README bővítése telepítési és futtatási instrukciókkal.

Automatizált tesztelés bevezetése.