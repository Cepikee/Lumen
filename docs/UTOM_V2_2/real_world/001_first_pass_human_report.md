# REAL_WORLD_ARTICLE_001 – első vak futás emberi jelentése

## Mérési keret

- Tesztazonosító: REAL_WORLD_ARTICLE_001
- Bemenet: docs/UTOM_V2_2/real_world/001_source_article.txt
- Bemeneti SHA-256: 8201C036E78C91A0C1DB26C6EE1BEC86217EFCB70AF7DA3EBD049D9EFCF2180E
- Futtatási út: a jelenlegi lib/v22/deterministic-text-provider.cjs predictArticle útja, amely a lib/v2/deterministic-semantic.js determinisztikus kivonatolóit hívja.
- Adatbázis-írás: nem történt.
- Külső provider/AI: nem történt hívás.
- A futás vak volt: az extractor nem kapott emberi megoldókulcsot, várható eredményt vagy cikkenkénti fixture-t.
- A teljes első eredmény változatlan mentése: 001_first_pass_raw.json.

Ez a futás a biztonságosan reprodukálható determinisztikus szövegfeldolgozási utat méri. A DB-persistálási és read-model projection réteg nem lett mesterségesen bekapcsolva, mert az ehhez szükséges adatbázis-művelet ebben a mérési körben nem volt indokolt, és a kért első eredmény sértetlen megőrzését veszélyeztette volna.

## Első futás számszerű eredménye

| Elem | Darab |
|---|---:|
| Entitás | 3 |
| Kapcsolat | 0 |
| Állítás | 2 |
| Esemény | 0 |
| Időbeli változás | 0 |
| Konfliktus | 0 |
| Omisszió-jelzés | 0 |

## Entitások

| Raw mention | Normalizált név | Típus | Emberi értékelés | Bizonyíték |
|---|---|---|---|---|
| Telex + sortörés + Zoltán | telex zoltán | person | ROSSZUL ÉRTETTE: a fotó/jóváírás környezetét és a személynevet egy entitássá fűzte össze | A cikk fotó-jóváírása és a név külön szerepel |
| Novák András | novák andrás | person | HELYESEN FELISMERTE | A cikk független Volvo-szakértőként nevezi meg |
| Vágány Tamás | vágány tamás | person | HELYESEN FELISMERTE | A cikk ügyvédként nevezi meg |

A cikk központi szereplői (Zoltán, Lajos, Zoltán felesége), a Volvo V60, a holland és berlini kereskedők, a holland szakszerviz, a Hovány márkakereskedés, az Auto DNA, az Eurotax, a D5T5, a bíróság, valamint az Európai Unió nem jelentek meg önálló, használható entitásként.

## Kapcsolatok

A motor nem adott vissza kapcsolatot.

Ezért nem strukturálta többek között:

- Zoltán és felesége → Volvo megvásárlása, majd eladása Lajosnak;
- Lajos → Volvo új tulajdonosa;
- holland szakszerviz → korábbi karbantartási adat;
- Hovány márkakereskedés → szoftveres vizsgálat;
- bíróság → jogerős ítélet;
- Novák András → szakértői vélemény;
- Vágány Tamás → jogi értelmezés.

## Állítások

### 1. PROJECT_COST, 1.5 million HUF

- Raw predicate: PROJECT_COST
- Érték: 1.5
- Egység: million HUF
- Evidence: „A vevő ügyvédje ezután már nem az autó visszavásárlását kérte Zoltántól, hanem azt, hogy térítse meg az addigi javítások költségét, illetve a Volvo adásvételkor ismert és valós futásteljesítménye közti különbségből adódó piaci értékkülönbséget, vagyis összesen 1,5 millió forintot.”
- Emberi értékelés: ROSSZUL ÉRTETTE / ROSSZUL KÖTÖTTE.
- A szöveg valóban 1,5 millió forintos követelést említ, de ez nem projektköltség, hanem a javítási költségek és az értékkülönbség megtérítésére előterjesztett igény. A PROJECT_COST címke üzleti jelentése így hibás.
- Attribúció: null, miközben a mondat a vevő ügyvédjének kérelmét írja le.

### 2. VEHICLE_COUNT, null

- Raw predicate: VEHICLE_COUNT
- Érték: null
- Egység: vehicle
- Evidence: „Az ügyvéd úgy látja, nagy kockázatot vállal, aki külföldön vásárol használt autót, vagy külföldről behozott járművet ad el egy magyarországi vevőnek.”
- Emberi értékelés: NEM ALÁTÁMASZTOTT.
- A mondat nem járműdarabszámot állít, a null értékhez sem tartozik számszerű vagy szemantikai alap.
- Attribúció: null, noha a mondat Vágány Tamás ügyvédi véleményéhez tartozik.

## Számok

A nyers eredményben egyetlen számszerű érték szerepel:

| Szám | Motor által rögzített kapcsolat | Értékelés |
|---|---|---|
| 1,5 millió forint | PROJECT_COST | Az összeg említése felismerhető, de a predicate és az attribúció hibás |

A cikkben szereplő további fontos számok nem kerültek strukturált eredménybe: 4,5 millió forint, 2019, 2014, 153 ezer km, 13 700 euró, 4,4 millió forint, 168 ezer km, 227 ezer km, 74 ezer km, 1–3 év, 2020, 330 ezer forint, 247 ezer km, 257 ezer km, 442 ezer forint, 169 ezer km, 4,8 millió forint, 256 ezer km, 900 ezer forint, 170 ezer km és a körülbelül 75 ezer km-es eltérés.

## Események és idővonal

A motor nem adott vissza eseményt vagy időbeli változást. Ezért nem épített idővonalat a következő, a cikkben egymáshoz rendelt történésekből:

1. 2019 május: Zoltán megvásárolja a 2014-es Volvo V60-at Berlinben.
2. 2019 május: a járművet hazahozzák és Zoltán felesége nevére helyezik forgalomba.
3. 2019 december: eladják Lajosnak 168 ezer km kijelzett értékkel.
4. Két héten belül: hibajelzések és előéleti vizsgálat.
5. 2018 december: a holland szerviz 227 ezer km-es korábbi adatot közöl.
6. 2020 május–június: javítások, majd a kijelzett érték 168 ezerről közel 247 ezerre ugrik.
7. Az eljárás alatt: szakértői becslés nagyjából 257 ezer km-re.
8. 2026 június vége: jogerős másodfokú ítélet, körülbelül 4,5 millió forintos fizetési kötelezettség.

Különösen nem őrizte meg a „kijelzett érték”, „korábbi szervizadat” és „szakértői becslés” eltérő idő- és bizonyossági szintjét.

## Konfliktusok és FALSE CONFLICT CHECK

- Észlelt konfliktus: 0.
- Automatikus winner: nincs.
- FALSE CONFLICT CHECK: nincs kibocsátott konfliktus, ezért téves konfliktus sem keletkezett. Ugyanakkor a konfliktusfelismerési képesség ezen az egy futáson nem mérhető, mert a motor a cikkben szereplő eltérő kilométeradatokat egyáltalán nem strukturálta.
- A cikkben ténylegesen elkülönítendő eltérések vannak: 153/168/227/247/257 ezer km különböző időpontokhoz és bizonyossági szintekhez kötődnek. Ezeket a motor nem téves konfliktussá alakította, hanem kihagyta.

## Forráshoz kötés

Mindkét kibocsátott claim evidence szövege és evidence spanje karakter szerint megtalálható az eredeti cikkben: 2/2 span pontosan illeszkedik. Ez a szöveges visszakereshetőség szempontjából PASS.

A szemantikai visszakötés csak 1/2 esetben elfogadható: az 1,5 millió forintos összeg a cikkben szerepel, de a PROJECT_COST jelentés hibás. A második claimhez nincs alátámasztott járműdarabszám.

## Utólagos emberi audit

Az audit az első raw futás megőrzése után készült. A kategóriák nem kerültek vissza az extractor bemenetébe, és nem módosították a raw JSON-t.

### HELYESEN FELISMERTE

- Novák András és Vágány Tamás személynévként.
- Az 1,5 millió forintos összeg szövegbeli előfordulását.
- Mindkét evidence span tényleges jelenlétét az eredeti cikkben.
- Nem állított elő kitalált kapcsolatot, eseményt vagy konfliktust.

### KIHAGYTA

- A központi szereplőket és szerepeiket: Zoltán, Lajos, Zoltán felesége.
- A Volvo V60-at és a kereskedői/szerviz előéletet.
- A teljes kilométer-idősort és a pénzügyi tételek többségét.
- A per, szakértői vizsgálat és jogerős ítélet eseményláncát.
- A bírósági döntést, a másodfokú jogerőt és a körülbelül 4,5 millió forintos fizetési kötelezettséget.

### ROSSZUL ÉRTETTE / ROSSZUL KÖTÖTTE

- Az 1,5 millió forintos jogi igényt projektköltségként címkézte.
- A Telex + Zoltán összevont entitás fotó-jóváírási szöveg és személynév határát tévesztette el.
- A két ügyvédi/szakértői állítást attribúció nélkül, általános állításként adta vissza.

### NEM ALÁTÁMASZTOTT

- VEHICLE_COUNT = null – nincs hozzá járműdarabszámot állító szövegrész.

### DUPLIKÁCIÓ

- A strukturált kimenetben azonos szemantikai állítás duplikálása nem látható.

### EMBERI ELLENŐRZÉST IGÉNYEL

- Az 1,5 millió forintos igény pontos bontása, mert a mondat több költségelemet és értékkülönbséget fog össze.
- A holland szerviz vezérléscserére vagy elektronikus hibajavításra vonatkozó, egymással vitatott értelmezése.
- A jogi szakértői állítások és a bírósági ténymegállapítások szétválasztása.

## Mérőszámok

Az alábbi nevezők egyetlen cikk utólagos, kézzel definiált auditkészletét jelentik; nem általános pontossági becslések.

| Mérőszám | Eredmény | Értelmezés |
|---|---:|---|
| Fontos entitás-lefedettség | 2/14 teljesen helyes; 1/14 hibásan összefűzött | WEAK |
| Fontos kapcsolat-lefedettség | 0/10 | WEAK |
| Fontos állítás-lefedettség | 0/20 teljesen helyes; 1/20 részlegesen felismert | WEAK |
| Kritikus tény-lefedettség | 0/12 teljesen helyes | WEAK |
| Időbeli változások felismerése | 0/8 | WEAK |
| Attribúció helyessége | 0/2 | FAIL |
| Tagadásmegőrzés | A cikkben több tagadás van, strukturált tagadott claim nincs | FAIL |
| Modalitás/feltételesség megőrzése | 0/5 fontos modalitás/forrásjelölés | FAIL |
| Evidence span helyessége | 2/2 szöveg szerint | PASS |
| Szemantikai evidence-kötés | 1/2 elfogadható | PARTIAL |
| Truly unsupported count | 1 | A VEHICLE_COUNT claim |
| False conflict count | 0 kibocsátott; felismerési minta nem mérhető | N/A a detektálásra |
| Duplicate count | 0 | PASS |

A mintanagyság miatt ezek a számok a jelenlegi cikk feldolgozását írják le, nem a motor általános teljesítményét.

## Rövid UTOM-felhasználói nézet

### Rövid hír

NEM ÁLL RENDELKEZÉSRE A JELENLEGI DETERMINISZTIKUS RENDSZERBŐL

A first-pass prediction nem tartalmazott összefoglaló vagy read-model summary mezőt.

### Kontextus / „Mi van mögötte?”

A ténylegesen létrejött strukturált adatok alapján csak ez mutatható meg biztonságosan:

- két felismert személy: Novák András és Vágány Tamás;
- egy 1,5 millió forintos, hibásan PROJECT_COST-ként jelölt állítás;
- egy nem alátámasztott, null értékű VEHICLE_COUNT állítás.

A cikk tényleges jogi, jármű-előéleti és időbeli kontextusa nem áll rendelkezésre a jelenlegi first-pass read-model kimenetben.

# REAL_WORLD_001_FINDINGS

## RW001-F01 – Magyar összetett számok és járműfutás-teljesítmény kihagyása

- Súlyosság: HIGH
- Általánosítható: IGEN
- Valószínű gyökérok: a magyar „ezer/millió” alakok, keskeny nem törő szóközös pénzformák, kilométer-egységek és időpontok jelenlegi determinisztikus mintázása nem fedi le a cikk alakjait.
- Érintett modul: lib/v2/deterministic-semantic.js, a numerikus és időbeli kivonatolási ág.
- Ebben a körben: NEM JAVÍTVA.

## RW001-F02 – Entitáshatár-hiba fotó-jóváírás és személynév között

- Súlyosság: HIGH
- Általánosítható: IGEN
- Valószínű gyökérok: a blokk-/sorkörnyezetet használó névfelismerés a „Telex” és „Zoltán” szövegrészből egy összefűzött mentiont készített.
- Érintett modul: lib/v2/deterministic-semantic.js entity extraction.
- Ebben a körben: NEM JAVÍTVA.

## RW001-F03 – Jogi és pénzügyi állítás hibás predicate-je

- Súlyosság: HIGH
- Általánosítható: IGEN
- Valószínű gyökérok: a pénzösszeg felismerése a „követelés/árleszállítás/értékkülönbség” jelentést PROJECT_COST címkére vetíti.
- Érintett modul: claim predicate mapping.
- Ebben a körben: NEM JAVÍTVA.

## RW001-F04 – Attribúció és modalitás elvesztése

- Súlyosság: HIGH
- Általánosítható: IGEN
- Valószínű gyökérok: az „ügyvéd szerint”, „úgy emlékszik”, „állítja”, „szerinte”, „nem tudjuk”, „felmerül” típusú forrás- és bizonytalanságjelölők nem kerültek be a kibocsátott claimekbe.
- Érintett modul: claim attribution/modality/uncertainty extraction.
- Ebben a körben: NEM JAVÍTVA.

## RW001-F05 – Nem alátámasztott nullértékű claim

- Súlyosság: HIGH
- Általánosítható: IGEN
- Valószínű gyökérok: a VEHICLE_COUNT szabály egy járművásárlási kockázatról szóló mondatot darabszám-állításként értelmez, szám nélkül is.
- Érintett modul: claim predicate/value extraction.
- Ebben a körben: NEM JAVÍTVA.

## RW001-F06 – Jogi esemény- és idővonal-kivonatolás hiánya

- Súlyosság: HIGH
- Általánosítható: IGEN
- Valószínű gyökérok: a jelenlegi eseménykivonatoló a narratív jogi és jármű-előéleti eseményeket nem alakítja eseményekké.
- Érintett modul: event extraction és temporal change extraction.
- Ebben a körben: NEM JAVÍTVA.

## Változtatási korlát

A fenti findingek dokumentált mérési eredmények. Ebben a körben egyik intelligencia-modul, extractor, regex, normalizáló, deduplikáló vagy konfliktuskezelő kódja sem módosult.

## Végső állapot

REAL WORLD ARTICLE #001: FAIL

EVIDENCE SAFETY: PASS

UNSUPPORTED CLAIM SAFETY: FAIL

ATTRIBUTION SAFETY: FAIL

TEMPORAL UNDERSTANDING: WEAK

CLAIM COVERAGE: WEAK

ENTITY/RELATION COVERAGE: WEAK

FALSE CONFLICT SAFETY: PASS (0 téves konfliktus kibocsátva; a detektálási képesség ezen a futáson nem bizonyítható)

### Legjobb 5 dolog, amit helyesen értett meg

1. Novák András személynévként való felismerése.
2. Vágány Tamás személynévként való felismerése.
3. Az 1,5 millió forintos összeg szövegbeli előfordulásának megtalálása.
4. A két kibocsátott evidence span pontos visszavezetése az eredeti cikkre.
5. Nem generált kitalált kapcsolatot, eseményt vagy konfliktust a sok kihagyott információ pótlására.

### Legfontosabb 5 dolog, amit kihagyott

1. A Zoltán–Lajos–feleség szereplői és a Volvo adásvételének kapcsolata.
2. A 153/168/227/247/257 ezer km-es időbeli futásteljesítmény-lánc.
3. A holland szerviz, Hovány, Auto DNA, Eurotax és D5T5 szerepe.
4. A per, szakértői vizsgálat, első- és másodfokú döntés teljes eseménylánca.
5. Az idézett személyek állításai, tagadásai és bizonytalansági szintjei.

### Legveszélyesebb félreértések

- A 1,5 millió forintos jogi igény projektköltségként való megjelenítése.
- A VEHICLE_COUNT = null nem alátámasztott claim.
- A „Telex / Zoltán” hibás, összefűzött személyentitás.
- Az attribúció elvesztése, ami ügyvédi vagy féloldali állítást tényként mutathatna.
- A kilométeradatok teljes időbeli kihagyása, amely a cikk lényegét távolítja el.

### Összes nem alátámasztott állítás

- VEHICLE_COUNT = null – nincs hozzá járműdarabszámot állító szövegrész.

### Összes téves konfliktus

- Nincs kibocsátott téves konfliktus. Ez biztonságos nulla, de nem jelenti a konfliktusdetektor megfelelő lefedettségét, mert a releváns eltérő értékek sem kerültek be.

### Következő fejlesztési körre javasolt általános hibacsoportok

1. Magyar számalakok, mértékegységek és pénzformák általános kezelése.
2. Entitáshatárok és fotó-/szerzői metaadatok leválasztása a törzsszövegről.
3. Pénzügyi és jogi predicate-ek szétválasztása.
4. Attribúció, modalitás, feltételesség és tagadás megőrzése.
5. Jármű-előéleti és jogi események idővonalas modellje.
6. Nullértékű vagy szám nélküli claim-ek tiltása, illetve biztonságos elutasítása.
