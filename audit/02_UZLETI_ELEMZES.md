# Utom.hu – üzleti hasznosíthatóság és költségmodell

Dátum: 2026-09-24. Alap: a `7df3f0792715f513f1293277b97095dcbbf89ce4` commit [technikai auditja](F:/Projekt2025/Lumen/audit/01_TECHNIKAI_AUDIT.md). Minden ráfordítás, ügyfélszám, ár és használati mennyiség alább **tervezési feltételezés**, kivéve a külön hivatkozott kódtényt és ellenőrzött modellárat. Nincs igazolt piaci kereslet, fizető ügyfél, konverzió vagy jelenlegi üzemeltetési mérés.

## 1. Milyen üzlet építhető a meglévő rendszerre?

Elsőként egy szűk fókuszú, magyar híreket figyelő B2B pilot indokolt: mentett témák és kulcsszavak, forráslinkes találatok, napi összesítés, visszakeresés és CSV-export. Ennek jelentős adatfeldolgozó és felületi alapja már megvan. A felhasználó számára eladott eredmény a figyelésre fordított idő csökkentése és a releváns említések megtalálása lehet; ezt interjúval és fizetős pilottal kell bizonyítani.

Újrafelhasználható: Next/React felület, hétforrásos gyűjtő, AI-összefoglalók közös tárolása, MySQL, kereső, kategóriák, dashboard-widgetek, email-küldés technikai alapja. Bizonyíték: [főoldal](F:/Projekt2025/Lumen/app/page.tsx), [pipeline](F:/Projekt2025/Lumen/pipeline/cron.js), [summaries API](F:/Projekt2025/Lumen/app/api/summaries/route.ts), [mailer](F:/Projekt2025/Lumen/lib/mailer.ts).

Kezdetben ne képezze fizetős ígéret alapját az objektív médiaminőség-pontszám, a bizonyított hírátvétel, a publikálási elsőség vagy a jövőbeli hírmennyiség pontos előrejelzése. A meglévő clickbait, duplication, speed index és forecast kód nem biztosít ehhez megfelelően validált bizonyítékot. Ezek javítható, később elkülönített kísérleti funkciók.

## 2. Ügyfélcsoportok és ellenőrizendő igények

| Célcsoport | Lehetséges feladat, amelyért fizethet | Újrafelhasználható alap | Legfontosabb bizonyítandó feltételezés |
|---|---|---|---|
| Újságírók | Témafigyelés, előzmények keresése, eltérő források egymás mellé helyezése | Kereső, kulcsszavak, klaszterkezdemény | Jobb-e a napi munkafolyamat a jelenlegi ingyenes eszközeiknél? |
| Szerkesztőségek | Közös témalista, konkurens témák lefedettsége, kihagyott említések | Forrás-/kategóriaanalitika | Elég-e a hét forrás és milyen késés fogadható el? |
| PR-ügynökségek | Ügyfél- és kampányfigyelés, ügyfélriport, export | Kulcsszavak, összefoglalók, dashboard | Kell-e online sajtón túli TV/rádió/social; elég pontos-e a találati lista? |
| Vállalatok | Márka, vezetők és versenytársak megjelenései, napi briefing | Közös híradatbázis, email-alap | Mennyit ér az időmegtakarítás és a gyors észlelés? |
| Piackutatók | Témák időbeli változása, exportálható korpusz és módszertan | Tárolt szöveg/embedding/források | Van-e elég hosszú, teljes, jogtisztán felhasználható történet? |
| Lakossági előfizetők | Személyes hírkivonat, témaszűrés | Hírlista és összefoglalók | Létezik-e fizetési hajlandóság ingyenes híroldalak mellett? |

A hét forrás nem országos teljes médiamonitoring. A hírforrás-lista [fetch-feed:295](F:/Projekt2025/Lumen/app/api/fetch-feed/route.ts:295) alapján igazolt, a lefedettség teljessége nem. Nem végeztem versenytárs-árazási vagy reprezentatív piackutatást; a fenti sorrend műszaki újrafelhasználhatósági javaslat.

## 3. Eladható funkciók és ráfordítás

Egy fejlesztőnap 8 óra koncentrált munka. A becslések tapasztalt full-stack fejlesztőre, szűk pilotra és hozzáférhető sémaexportokra vonatkoznak. Tartalmazzák az adott funkció célzott ellenőrzését, de az alapbiztonság/adathelyreállítás közös munkáját nem minden sorban újra. A sorok összeadása átfedések miatt nem ad korrekt projektösszeget; az összesített kritikus út a fejlesztési tervben szerepel.

| Fizetős képesség | Állapot | Hátralévő munka | Becsült nap | Fő függőség |
|---|---|---|---:|---|
| Közel valós idejű hírfigyelés | Részben elkészült | Stabil queue, forrásonkénti ütemezés, késésmérés, hibajelzés | 5–9 | Biztonság, séma, feedengedélyek; pipeline/cron |
| Egyedi kulcsszavas értesítés | Teljesen új fejlesztés szükséges | Mentett figyelés, kizárószavak, feldolgozási sor, email-kézbesítés, leiratkozás | 6–10 | Auth, watchlist/outbox; meglévő mailer felhasználható |
| Hírforrások összehasonlítása | Részben elkészült | Időadat-javítás, klasztervalidáció, korrekt elnevezés és mintaszám | 6–12 | articles/clusters, emberi mintabírálat |
| Történeti hírelemzés | Részben elkészült | Dátumszűrés, visszakeresés, teljesítmény, időbélyeg/provenance | 4–8 | Megmaradt adatok tényleges ellenőrzése |
| Korábbi hónapok adatcsomagja | Nem állapítható meg | Read-only DB-leltár és licencellenőrzés | 1–3 felmérés, pótlás külön | Éles mentés és felhasználási jog |
| Versenytársfigyelés | Részben elkészült | Keresőre épülő entitás-/aliaslista, mentett nézetek, értesítés | 4–7 | Keresés, watchlist; ügyfélspecifikus névazonosságok |
| Automatikus napi jelentés | Részben elkészült | Globális autohirek helyett ügyfélszűrés, forráshivatkozás, ütemezett kézbesítés | 4–7 | Watchlist, outbox, daily_reports séma |
| Heti jelentés | Teljesen új fejlesztés szükséges | Heti aggregáció, összehasonlítás, sablon, kézbesítés | 2–4 a napi után | Napi jelentés közös infrastruktúrája |
| CSV-export | Teljesen új fejlesztés szükséges | Jogosultság, mezők, méretlimit, táblázatképlet-injekció elleni védelem | 2–4 | Stabil lekérdezés és licenc |
| Ügyfél-API | Részben elkészült technikai alap | Belső API-k elé ügyfélkulcsok, kvóta, lapozás, verziózás, dokumentáció | 5–9 | Tenant/auth, mérés, licenc; a kereskedelmi réteg új |
| Többfelhasználós vállalati csomag | Teljesen új fejlesztés szükséges | Szervezet, tagság, meghívás, szerepek, erőforrás-izoláció | 8–15 | Új tenantmodell és negatív jogosultsági tesztek |
| Fizetés és előfizetés | Teljesen új fejlesztés szükséges | Checkout, ismételt díj, aláírt/idempotens webhook, lemondás, számlázás | 6–10 | Biztonságos user/entitlement, szolgáltatói fiókok |
| Megbízható clickbait-elemzés | Részben elkészült | Parser, definiált pontskála, indoklás, verziózás, vak mintabírálat | 4–8 | Címkézett magyar adatok és emberi szakértő |

„Már elkészült” minősítést a teljes fizetős funkciók egyike sem kap: a kód létezése nem egyenlő igazolt üzemi működéssel. Az új API kereskedelmi rétege önálló fejlesztés, noha az adatlekérdezések újrahasznosíthatók. A `users.is_premium` mező és a [prémiumoldal](F:/Projekt2025/Lumen/app/premium/page.tsx) nem fizetési rendszer.

## 4. Bevételi modellek és árazási hipotézisek

Lehetséges csomagolás: személyenkénti/havi alapdíj mentett figyelési témák és riportok korlátjával; később szervezeti alapdíj + felhasználói helyek; külön API/export-kvóta. Az általános híranyag közös, a figyelések ügyfélspecifikusak. A korlátlan ügyfelenkénti generatív AI-t ne tartalmazza az alapcsomag.

Interjúban tesztelhető, **nem piaci tényként megadott** árpontok: 9 900 Ft/hó nettó egyéni szakmai csomag, 29 900 Ft/hó nettó kiscsapat-csomag, egyedi vállalati ajánlat szerződött forrásokkal és SLA-val. Először konkrét ajánlatra kapott fizetési döntést kell mérni, nem azt, hogy a bemutató „tetszett-e”.

A jelenlegi prémiumoldal 1000 Ft/hó és 9000 Ft/év összeget ír, működő checkout nélkül. Az éves ár havi átlaga 750 Ft; ez a havi díjhoz képest háromhavi kedvezmény, miközben a szöveg két hónapot mond. Nettó/bruttó kezelés és bevételrealizáció nincs rendezve. Ez marketingvázlat, nem validált üzleti modell. [PremiumPage](F:/Projekt2025/Lumen/app/premium/page.tsx:33)

## 5. A korábbi 25 000 Ft/hó értelmezése

A napi 100–500 cikk, 9–12 forrás és 25 000 Ft/hó **tulajdonosi történeti adat**. Számla, tokennapló, hardver- vagy munkaráfordítás-kimutatás nem került átadásra. Nem tudható, benne volt-e a helyi Ollama gép, áram, fejlesztés, mentés, külső licencek vagy adó. A mostani kódban hét forrás és több párhuzamos feldolgozási út szerepel.

A 25 000 Ft technikai költség kis terhelésnél elképzelhető, de nem ellenőrzött előrejelzés. A közös AI-feldolgozás nem szorzódik automatikusan az ügyfelek számával: az olvasó API-k tárolt eredményt kérdeznek le. Ugyanakkor a dashboard, az értesítés, a riport, az export és az egyedi AI terhelése nő. A hibás retry-hurok, a publikus AI-végpont és a többszörös summarization már kevés ügyfélnél is költségkockázat.

## 6. Ellenőrizhető havi költségmodell

### Egységárak és képlet

2026-09-24-én megnyitott hivatalos dokumentáció: [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini) standard input **0,15 USD / millió token**, output **0,60 USD / millió token**; [text-embedding-3-small](https://developers.openai.com/api/docs/models/text-embedding-3-small) **0,02 USD / millió token**. A számítás nem vesz figyelembe cache-/batchkedvezményt. A modellárat a beszerzéskor újra kell ellenőrizni.

`F = 370 Ft/USD` **választott tervezési árfolyam**, nem aktuális devizajegyzés. 30 napos hónappal számolunk. Az árfolyamváltozás az USD-alapú AI-részt arányosan módosítja. Minden összeg áfa és egyéb adók nélküli modellérték; az alkalmazandó adókezelés külön tisztázandó.

```text
A = napi feldolgozott cikk × 30
I, O = egy cikk összes chat-lépésének input/output tokenje együtt
E = egy cikk embedding tokenje
r = retry/újrafeldolgozási szorzó
K_közös = A × r × (I×0,15 + O×0,60 + E×0,02) / 1 000 000 × F

N = fizető ügyfelek száma; q = AI-kérések/ügyfél/hó
K_egyedi = N × q × r_u × (I_u×0,15 + O_u×0,60) / 1 000 000 × F

K_technikai = K_közös + K_egyedi + K_DB/tárhely + K_szerver + K_külső + L
L = tényleges adatlicenc- és tartalomfelhasználási díj (ismeretlen)
```

Az input/output összeg **nem hívásonkénti**: a normál első főút nyolc chat + egy embedding hívását fogja át. A gyűjtői plusz összefoglalót is tartalmazza. A 12 000 input és 1600 output becslés, nem a kódból mért tokenmennyiség. A meglévő explicit pipeline-kimeneti korlátok összesen 1240 tokent engednek első próbára, ezen felül a gyűjtő limit nélküli kimenete és a próbálkozások számítanak.

### Alap- és stresszfeltételezések

| Paraméter | Alapmodell | Stresszmodell |
|---|---:|---:|
| Napi cikk | 300 | 500 |
| Havi cikk | 9 000 | 15 000 |
| Chat input / cikk összesen | 12 000 | 30 000 |
| Chat output / cikk összesen | 1 600 | 3 000 |
| Embedding token / cikk | 2 000 | 4 000 |
| Közös feldolgozási szorzó | 1,20 | 2,00 |
| Ügyfelenként AI-kérés / hó | 100 | 1 000 |
| Token / egyedi kérés input + output | 4 000 + 600 | 12 000 + 1 500 |
| Egyedi retry-szorzó | 1,10 | 1,50 |
| DB/szerver/külső keret | Alábbi táblázat | Ugyanazon sor kétszerese |

Alapmodell közös AI: **11 188,80 Ft/hó**; egyedi AI: **39,072 Ft/ügyfél/hó**. Ugyanezen alap cikkenkénti tokenfeltevéssel napi 100–500 cikk közös költsége **3729,60–18 648 Ft/hó**. Stresszmodell közös AI: **70 818 Ft/hó**; egyedi AI: **1498,50 Ft/ügyfél/hó**. A stressz nem felső korlát: a jelenlegi korlátlan retry és nyitott AI-végpont ennél is többet okozhat.

Az egyedi ügyfél-AI jelenleg **nincs kereskedelmi funkcióként megvalósítva**. A fenti tétel jövőbeli képességre képzett tartalék. Csak tárolt elemzések olvasásakor `q=0`, és ez a költség levonható.

### 10–1000 fizető ügyfél: technikai havi költség

Az infrastruktúra oszlopai tervezési keretek, **nem szolgáltatói ajánlatok vagy kapacitásbizonyítékok**. A DB/tárhely tartalmazza a mentésre szánt keretet; a szerver az alkalmazást, gyűjtőt és cache-t; a külső tétel email, naplózás, monitoring és domain időarányos kerete. A komponenseket beszerzéskor úgy kell bontani, hogy az egy gépen futó DB és app ne szerepeljen kétszer. A modell szöveges szolgáltatásra szól, GPU/Ollama-folyamatos üzem és videóforgalom nélkül.

| Ügyfél | Közös AI | Egyedi AI | DB + tárhely + backup | App/worker szerver | Külső szolgáltatás | Alap technikai összeg | Stressz technikai összeg |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 11 189 | 391 | 4 000 | 8 000 | 2 000 | **25 580 + L** | **113 803 + L** |
| 50 | 11 189 | 1 954 | 6 000 | 10 000 | 3 000 | **32 142 + L** | **183 743 + L** |
| 100 | 11 189 | 3 907 | 10 000 | 15 000 | 5 000 | **45 096 + L** | **280 668 + L** |
| 500 | 11 189 | 19 536 | 20 000 | 35 000 | 10 000 | **95 725 + L** | **950 068 + L** |
| 1 000 | 11 189 | 39 072 | 40 000 | 65 000 | 20 000 | **175 261 + L** | **1 819 318 + L** |

Ft/hó, kerekített megjelenítés; az összeg kerekítés előtti számokból készült, ezért a kiírt oszlopok összege 1 Ft-tal eltérhet. A licencek összege nem nulla, hanem **ismeretlen**. Lehet fix, forrásonkénti, felhasználóarányos vagy a továbbadás módjától függő; külön ajánlat kell. A tábla csak a leírt feltételezésekkel értelmezhető, nem ígéret arra, hogy a jelenlegi kód ekkora ügyfélszámot kiszolgál.

### Terhelési és tárhelyszámítás

Ügyfélszám helyett mérendő a párhuzamos aktív felhasználó és a widgetkérések száma. Példa: 1000 ügyfél 10%-a egyszerre aktív, oldalanként 15 widget 60 másodpercenként frissít: `100 × 15 / 60 = 25 kérés/másodperc`, a belépési csúcsok és más API-k nélkül. 100%-os egyidejű aktivitás ugyanezzel 250 kérés/másodperc. A valódi widgetszám és SQL-igény mérendő. [60 másodperces widget példa](F:/Projekt2025/Lumen/components/WSourceClickbait.tsx:36)

Tárhely példa: ha a szöveg, summary, JSON embedding, kulcsszavak és indexek együtt átlag 100 KB/cikk, napi 500 cikknél `500 × 365 × 100 KB = 18,25 GB/év` elsődleges adat. Három teljes példánynak megfelelő tárolás 54,75 GB, további binlog és napló nélkül. A 100 KB feltevést DB-méréssel kell lecserélni. A speed_index_history jelenlegi ismételt beszúrása ezt aránytalanul növelheti. Videónál `méret × napi videó × megőrzési nap`, hálózatnál `méret × megtekintés` az alap; ezek nincsenek a táblázatban.

Ollama önmagában nem ingyenes szolgáltatás: hardverbérlet/amortizáció, villamos energia és üzemeltetés tartozik hozzá. A forecast és a napi jelentés jelenleg ezt használja. Ezeket a pilotban vagy kikapcsolva kell tartani, vagy külön mért kapacitás- és költségsorral bevonni. A TTS és a videó első fizetős verzióból való kihagyása csökkenti a függőségeket.

## 7. Árbevétel, működési eredmény és profit

**Árbevétel ≠ profit.** A 9 900 Ft nettó/hó árponttal készült alábbi példa pusztán érzékenységi számítás. A fizetési díj feltételezett 3% (nem konkrét szolgáltató díja). Az alap technikai költséghez havi 300 000 Ft munkaráfordítási és 100 000 Ft értékesítési/adminisztrációs keretet adtam, plusz `L` licencdíjat. Ez a fix 400 000 Ft különösen 500–1000 ügyfélnél optimista: nem bizonyított, hogy ennyiből a support és ügyfélszerzés ellátható.

| Ügyfél | Nettó havi árbevétel | Modellezett működési költség | Modellezett adózás előtti működési maradvány |
|---:|---:|---:|---:|
| 10 | 99 000 | 428 550 + L | **−329 550 − L** |
| 50 | 495 000 | 446 992 + L | **48 008 − L** |
| 100 | 990 000 | 474 796 + L | **515 204 − L** |
| 500 | 4 950 000 | 644 225 + L | **4 305 775 − L** |
| 1 000 | 9 900 000 | 872 261 + L | **9 027 739 − L** |

Ez **nem tényleges profit-előrejelzés**. A tényleges eredményből még a valós létszám, akvizíciós költség, lemorzsolódás, visszatérítés, fejlesztési költség elszámolása, finanszírozás, amortizáció és adók is számítanak. A profit csak a valós bevétel, teljes költség és adózás ismeretében állapítható meg. Egy 1 millió Ft/hó licenc ugyanennyivel csökkentené a maradványt; ez érzékenységi példa, nem licencár-becslés.

Képlet: `nettó árbevétel = aktív fizető ügyfelek × tényleges nettó átlagár`; `fedezet = árbevétel − közvetlen szolgáltatási költségek`; `működési eredmény = fedezet − bér/saját munka − értékesítés − adminisztráció − egyéb működési költség`; az adózott profit ettől további tételekkel eltér.

A régi 1000 Ft/hó árnál még 50 ügyfél 50 000 Ft névleges havi bevétele is alig haladná meg az alap technikai kiadást, saját munka és licencek előtt; a nettó árbevétel adózástól függően ennél alacsonyabb is lehet. Az alacsony lakossági ár nagy volumen és olcsó ügyfélszerzés nélkül nem finanszíroz automatikusan B2B szolgáltatási színvonalat.

## 8. Költségcsökkentés a meglévő rendszer továbbépítésével

1. **Gyűjtés és AI szétválasztása:** a feed csak gyűjtsön, ugyanazt a cikket ne foglalja össze újra a pipeline. Egyedi tartalomhash/promptverzió alapján készüljenek közös elemzések.
2. **Tartós munkaállapot:** lépésenkénti checkpoint, véges retry, hibasor és napi költségkeret. A már sikeres AI-lépés ne fusson újra egy későbbi DB-hiba miatt.
3. **Közös olvasási cache:** kategória/forrás/időszak aggregátumok központi cache-e, inkrementális frissítés; widgetek összevont lekérdezése. Az ügyfélspecifikus jogosultságot a cache-kulcs is tartsa tiszteletben.
4. **AI-hívások összevonása kontrolláltan:** cím/kategória/kulcsszó/sentiment strukturált közös eredményben kipróbálható, de csak minőségmérés után. A hosszú elemzés lehet igény szerinti, szintén közösen cache-elt.
5. **Klaszter/speed index inkrementálisan:** ne minden cikknél számoljuk újra és írjuk le az egész napot. A history egy esemény–forrás–verzió kombinációhoz kötődjön.
6. **Ügyfelenkénti korlátok:** az alap figyelés SQL-ből működjön, az egyedi generatív kérdések kapjanak kvótát, maximum kontextust és költségelszámolást. Ne legyen korlátlan csomag mérési adatok nélkül.

Ezek javaslatok; az audit során egyik sem került implementálásra. A műszaki indokokat a technikai jelentés P-01–P-04 és S-02/S-07 megállapításai támasztják alá.

## 9. Piaci és pénzügyi validációs terv

Első körben 12–15 strukturált beszélgetés, legalább három célcsoportból. Mérendő a jelenlegi eszköz, heti munkaidő, kritikus hiányzó forrás, hibás találat költsége és a döntéshozó személye. Utána 3–5 pilotpartner saját témalistával és előre egyeztetett árral; a valódi fizetési hajlandóságot szerződés/számlázott pilot igazolja.

Javasolt döntési kapuk (célok, nem már elért eredmények):

- Legalább három ténylegesen fizető pilotpartner és legalább kettő megújítási szándéka a próba végén.
- Felhasználónként legalább heti egy dokumentált, érdemi felhasználási eset; legalább 30% megtakarított figyelési/riportidő a saját baseline-hoz képest.
- Címkézett tesztkészleten legalább 90% releváns találati pontosság, a kihagyott fontos említések külön mérésével; névazonosságot és ékezetváltozatot tartalmazó minták.
- Mért, stabil feldolgozási egységköltség; a közvetlen technikai + licencköltség az adott csomag nettó árának legfeljebb 30%-a legyen a tényleges használat mellett.
- A tartalomfelhasználási jog és az elérhető forráslista minden pilotajánlat előtt tisztázott.

Ha a fizetési hajlandóság vagy a forráslicenc nem igazolható, előbb a célpiacot/csomagot kell módosítani, és csak utána vállalati extrákba beruházni. A projekt értéke a meglévő feldolgozásban és felületben van; a fizetős szolgáltatás értéke a bizonyított pontosság, biztonság, kézbesítés és megbízhatóság hozzáadásával teremthető meg.
