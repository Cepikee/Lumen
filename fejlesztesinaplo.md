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






Új fejlesztési irányelvek – 2025-12-17
Kiinduló probléma
A cron.js jelenlegi működése nem fenntartható: a summarize-all csak egyszer fut a cron végén, emiatt túl sok adatot újratölt, redundáns feldolgozást okoz, és a 7 napos nézet nem stabil, míg a 30 napos nézet már megjelenik, de nem megbízható.

Eddigi javaslatok
Ciklusos feldolgozás: a summarizer folyamatosan fusson, ne csak egyszer.

Batch és limitálás: kisebb adagokban (pl. 100 rekord), párhuzamosan, de korlátozott concurrency‑vel.

Feldolgozási státusz flag: minden rekordhoz pending, in_progress, done jelölés.

Inkrementális summarizálás: csak az új vagy változott rekordokat dolgozzuk fel.

Cache és deduplikáció: tároljuk az összegzéseket, ne kérjünk feleslegesen újra.

Monitoring és logolás: batch méretek, hibák, időtartamok nyomon követése.

Új fejlesztési irányelvek
Idempotencia minden műveletben

Minden summarizáló és feldolgozó művelet legyen idempotens: többszöri futtatás ugyanarra az adatra ne okozzon duplikációt vagy hibát.

Ez biztosítja, hogy újrafutás esetén sem lesz adatvesztés vagy ismétlés.

Inkrementális feldolgozás, ne nulláról

Ne az egész időszakot dolgozzuk újra, hanem csak az újonnan érkezett vagy módosult rekordokat.

Ez csökkenti a terhelést és gyorsítja a frissítést.

Cache használata

Az összegzéseket és aggregációkat cache‑ben tároljuk (pl. Redis vagy külön táblában).

A frontend mindig a cache‑ből olvas, így elkerülhető a felesleges újratöltés.

Duplikáció szűrése

Minden rekordhoz kulcs (keyword + url + date) alapján deduplikálás.

Így nem kerülhet be kétszer ugyanaz a cikk.

Státusz flag kötelező

Minden rekordhoz legyen status mező (pending, in_progress, done, failed).

Ez biztosítja az átlátható feldolgozást és megakadályozza a káoszt.

Queue alapú feldolgozás

Queue nélkül káosz van: be kell vezetni egy üzenetsort (Redis Streams, RabbitMQ, SQS).

Az új cikkek bekerülnek a queue‑ba, a summarizer pedig folyamatosan fogyasztja őket.

Ez biztosítja a skálázhatóságot és a stabil feldolgozást.

Mire jutottunk így
A rendszer folyamatosan, ciklikusan dolgozik, nem egyszeri tömeges futásokkal.

Minden művelet idempotens, így újrafutásnál nincs duplikáció.

Az adatok inkrementálisan kerülnek feldolgozásra, nem nulláról.

A cache és a deduplikáció csökkenti a felesleges újratöltést.

A státusz flag átláthatóvá teszi a folyamatot.

A queue bevezetése megszünteti a káoszt, és biztosítja a skálázható, megbízható működést.
















# Fejlesztési napló – 2025-12-17
## Mi változott ez volt az utolsó változtatás
- Csökkentettük a kezdeti megjelenített trendek számát 50-re, hogy ne indítsunk 1000+ per-key API hívást.
- Hozzáadtunk egy "Továbbiak betöltése" gombot, ami batch-szerűen növeli a visibleCount-ot.
- bevezettünk egy ref alapú historyCache-et, amely megakadályozza, hogy ugyanazt a /api/trend-history végpontot többször hívjuk ugyanarra a kulcsszóra.
- A visibleCount visszaáll alapértékre, ha a felhasználói kereső, kategóriák vagy rendezés változik.
- Külön useEffect: 1) trends lista lekérése, 2) per-key history lekérése csak a jelenleg megjelenített elemekhez.
fix(trends): szigorított kategória- és kulcsszó promptok

- eltávolítva a végtelen ciklus a kategóriafüggvényből
- prompt szigorítás: csak Politika, Sport, Gazdaság, Tech engedélyezett
- kulcsszavaknál explicit utasítás, hogy ne írjon bevezetőt vagy magyarázatot
- megszüntetve a hibás sorok beszúrása (pl. "Here are the keywords...")


## 🟠 Magas prioritás
- Inkrementális feldolgozás
  - ⬜ Csak új vagy változott rekordok kezelése.
- Deduplication és státusz flag
  - ⬜ `processed` mező bevezetése.
- Frontend–backend összhang
  - ⬜ Modalban a `sources` átadása egyszerűsítve.
- Cache kezelés
  - ⬜ Felesleges újratöltések megakadályozása.

## 🟡 Közepes prioritás
- Logging és monitoring
  - ⬜ Részletes log minden batchről.
- Retry/backoff mechanizmus
  - ⬜ Exponential backoff hibák esetén.
- Tesztelés
  - ⬜ Unit tesztek a summarizerre.
  - ⬜ Terheléses tesztek a batch méretekre.


## 2025.12.18. ##
# Mától 8 kategóriábal ehet sorolni mindent. 
## 🛠️ Fejlesztési napló – Summarize-all javítás

## 📌 Probléma
A `summarize-all` route futtatásakor a **részletes elemzés (`detailed_content`)** nem került be az adatbázisba.  
Ennek oka az volt, hogy:
- A full insert hibára futott, mert a paraméterek száma vagy értéke nem stimmelt.  
- A fallback insert csak a rövid összefoglalót (`content`) mentette, így a hosszú elemzés elveszett.

## 🔍 Hibakeresés
- Külön teszt route (`longanalysis`) készült, amely közvetlenül hívta az AI-t és beszúrta a long analysis-t.  
- Ez hibátlanul lefutott, bizonyítva, hogy az AI output és az adatbázis mező rendben van.  
- A probléma tehát a `summarize-all` extra logikájában (plágium ellenőrzés, kulcsszavak, paraméterek) volt.

## ✅ Javítás
1. **SELECT lekérdezés módosítása**  
   - Most már nem csak az új cikkeket, hanem azokat is kiválasztja, ahol `detailed_content IS NULL OR = ''`.

2. **Insert blokk javítása**  
   - Debug log került be, hogy lássuk a placeholder és paraméter számot.  
   - A fallback insertet átírtuk úgy, hogy **a long analysis is bekerüljön**, ne csak a rövid összefoglaló.
   #✅ Insert fallback javítva → nem veszik el a hosszú elemzés.
#
## ✅ Prompt szigorítva → mindig magyar nyelvű output.
# ✅ AI-clean integrálva → minden rekord jelölve, nincs külön route szükség.
# ✅ Szintaxis hibák elhárítva → a try/catch/finally blokkok rendben záródnak.
# A fetch-feed route kiegészült a https://hvg.hu/rss feldolgozásával.
#
# Mostantól a rendszer a Telex és a HVG híreit is automatikusan betölti az articles táblába.
# 
# A beszúrási logika változatlan, így a duplikációk ellenőrzése és a published_at mező kezelése ugyanúgy működik.

> >   ## Fejlesztési napló – 2025.12.19.

## 🎯 Cél
A hírkártyák vizuális egységesítése, brand‑specifikus megjelenés kialakítása, valamint egy egyedi, animált watermark rendszer bevezetése, amely a forrás karakterét tükrözi.

---

## 🧱 1. Backend mezőszinkronizáció
- A `/api/summaries` endpoint nem adta vissza a `source` mezőt.
- A SELECT lekérdezést frissítettük, hogy tartalmazza a `source` oszlopot.
- A frontend így már helyesen megkapja a forrásadatot.

**Eredmény:**  
A feed újra működik, a források helyesen jelennek meg.

---

## 🎨 2. FeedItemCard egységesítése
- Egységes padding, margó, border‑radius, árnyék.
- Sötét téma fixálása.
- Brand‑színű bal oldali accent stripe.
- AI‑clean badge visszaállítása.
- Linkek és címek egységes stílusa.

**Eredmény:**  
A feed most már konzisztens, termékérzetű.

---

## 🖼️ 3. Watermark rendszer bevezetése
- A kártyák háttérébe diagonális watermark került (TELEX / HVG).
- A watermark a kártya közepén jelenik meg, halványan, nem zavaró módon.
- A megoldás teljesen CSS‑alapú, gyors, reszponzív.

**Eredmény:**  
A kártyák vizuálisan karakteresebbek, brand‑azonosak.

---

## 🌊 4. Forráshullám animációk
Két egyedi animáció készült:

### 🔵 TELEX – „Lélegző hullám”
- Finom pulzálás  
- Kék brand‑szín  
- Modern, tech‑érzet  

### 🟡 HVG – „Magazin sáv”
- Stabil, enyhén vibráló háttér  
- Sárga brand‑szín  
- Print‑lap hangulat  

**Eredmény:**  
A kártyák élnek, ritmusuk van, és a forrás karakterét tükrözik.

---

## 🧩 5. Stabil watermark fix
- A pseudo‑elem eredetileg a külső kártyára került, de a DOM‑ban nem jelent meg.
- A watermarkot áthelyeztük a `card-body` elemre (`feed-body` class), ami garantáltan létezik.
- A CSS‑szelektorok így már biztosan működnek.

**Eredmény:**  
A watermark és az animációk most már 100%-ban működnek.

---

## 🚀 Összegzés
A feed most:
- vizuálisan egységes  
- brand‑azonos  
- animált, élő  
- modern, prémium érzetű  
- stabil backend‑frontend adatkapcsolattal működik  

Ez egy nagy lépés a termék vizuális identitása felé.

---

## 📝 Git commit üzenet

