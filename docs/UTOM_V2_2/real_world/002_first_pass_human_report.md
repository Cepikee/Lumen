# REAL_WORLD_ARTICLE_002 – első vak futás emberi auditja

## Mérési keret és befagyasztás

- Tesztazonosító: `REAL_WORLD_ARTICLE_002`
- Bemenet: `docs/UTOM_V2_2/real_world/002_source_article.txt`
- Bemeneti SHA-256: `2308BE1E678713E4C4653ADDECE99DB1AE588A426020BDA691E62D43CFC80845`
- Első nyers eredmény: `docs/UTOM_V2_2/real_world/002_first_pass_raw.json`
- Első eredmény SHA-256: `744922AF3E877F822771E9EABB831CAC7614BD9359422FC17632ACFFAC517966`
- Állapotbefagyasztás: `docs/UTOM_V2_2/real_world/002_state_freeze.json`
- Branch: `develop/utom-recovery`
- Local HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Remote HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Kiindulási checkpoint: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- A releváns intelligencia- és benchmarkfájlok hash-ei a state freeze-ben rögzítve vannak; az első futás után nem változtak.
- A working tree-ben csak a teszt artefaktumai és a user-owned `AGENTS.md`, `CLAUDE.md`, `docs.zip` láthatóak. A user-owned fájlokhoz nem nyúltam.
- A futtatási út: `lib/v22/deterministic-text-provider.cjs` → `lib/v2/deterministic-semantic.js`.
- Adatbázis-írás, production-hozzáférés, fizetős AI-hívás és külső provider-hívás: 0.
- A first pass előtt nem módosult intelligence-kód, regex, extractor, benchmark vagy cikk-specifikus szabály.

## Vak first-pass eredmény

| Réteg | Darab |
|---|---:|
| Entitás | 1 |
| Numerikus említés | 1 |
| Állítás | 0 |
| Kapcsolat | 0 |
| Esemény | 0 |
| From→to változás | 0 |
| Konfliktus | 0 |
| Omisszió-jelzés | 0 |

### Entitások

Az egyetlen kibocsátott entitás:

| Raw mention | Normalizált név | Típus | Emberi értékelés |
|---|---|---|---|
| `Kereste` | `kereste` | organization | **ROSSZUL ÉRTETTE** – a „Kereste szolgálattal…” mondat igéjét szervezetként emelte ki. |

A cikk központi szereplője, **Jászai Mari**, továbbá Révész Sándor, az apa, az anya, a mostohaanya, a báty, az őrmester, Hubay vándortársulata, a Budai Népszínház, a Népszínház, Ászár, Kisbér, Győr, Bécs, Pest, a königgrätzi csata és a porosz–osztrák háború nem jelent meg használható strukturált entitásként.

### Kapcsolatok

A motor nem adott vissza kapcsolatot. Nem strukturálta például Jászai Mari és a szülőhelye, családja, a színházi társulatok, a katonai esemény, illetve a Népszínház vezetője közötti kapcsolatokat.

### Numerikus említések

| Raw | Érték | Egység | Kapcsolat |
|---|---:|---|---|
| `16 éves` | 16 | year | Nincs subject-, esemény- vagy idővonal-kapcsolat; a mondatban a 16 éves Mari szerepel. |

A cikk többi fontos numerikus adata – 1850. február 24., 1926. október 5., ötéves kor, tíz éves kor, az egy évszázad, valamint a történelmi időszak – nem került strukturált eredménybe.

### Állítások, attribúció, modalitás, feltételesség, tagadás

Állításból nulla készült. Emiatt a rendszer nem adott vissza:

- Jászai Mari születésére, gyerekkorára, bántalmazására vagy pályájára vonatkozó claimet;
- idézetet vagy emlékirat-attribúciót;
- a „lehet, hogy” bizonytalanságot a névváltoztatásnál;
- a történelmi és személyes események tagadását vagy feltételességét;
- a „nem mond le” záró állítást;
- az őrmester által elkövetett erőszak vagy a későbbi színházi kényszerítés attribúcióját.

Az unsupported **claim** darabszám ezért 0, de ez nem érdemi szemantikai biztonsági teljesítmény: a motor állításokat sem hozott létre.

### Események és idővonal

Eseményből és változásból nulla készült. A rendszer nem épített idővonalat legalább a következő, a cikkben időben egymáshoz kötött pontokból:

1. 1850. február 24.: születés Ászáron, a Bakonyalja/Kisbér környezetében.
2. Ötéves kor: az anya halála és az első szolgálat.
3. Tíz éves kor: a szülői házból való kilökés.
4. Bécs és Pest: szolgálói időszak.
5. Tizenhat éves kor: az őrmester által elkövetett erőszak.
6. A königgrätzi csata: sebesültmentés és kitüntetés.
7. Hubay vándortársulata, majd a Budai Népszínház/Népszínház: színészi pálya kezdete.
8. A Népszínház igazgatóbizottsági elnökének házassági feltétele és Jászai Mari elutasítása.

### From→to változások, delták és összehasonlítások

Nem készült változás, delta vagy comparison projection. A cikkben nincs olyan elsődleges from→to numerikus minta, amelyet a motor elrontott volna; a történeti életút állomásai és az élethelyzetek változásai azonban teljesen strukturálatlanok maradtak.

### Konfliktusok és false-conflict check

- Észlelt konfliktus: 0.
- Automatikus winner: nincs.
- False conflict: 0.

Ez csak azt bizonyítja, hogy a motor nem gyártott konfliktust a nulla claim miatt. A konfliktusfelismerési képesség ezen a futáson nem volt érdemben mérhető.

### Evidence integrity

A provider egyetlen claimet és egyetlen change-et sem állított elő.

| Ellenőrzés | Darab |
|---|---:|
| Összes persisted claim/change evidence span | 0 |
| Exact `rawSource.slice(start,end) === evidenceSpan.textSpan` egyezés | 0 |
| Offset-hiba | 0 |

`EVIDENCE SAFETY: PASS` – a vizsgálandó persisted spanok száma nulla, ezért offset-hiba nincs. Ez vacuous pass, nem bizonyítja a claim-evidence útvonal tényleges lefedettségét.

## Utólagos emberi audit

Az audit a `002_first_pass_raw.json` mentése után készült. Az audit eredménye nem került vissza az extractor inputjába, és a first-pass JSON-t nem módosította.

### HELYESEN FELISMERTE

- A `16 éves` felszíni numerikus kifejezést 16 évként felismerte.
- Nem adott ki olyan claimet, amelyhez nem volt létrehozott evidence span.

### KIHAGYTA

- Jászai Mari és a cikkben szereplő személyek, helyek, intézmények és történelmi események strukturált entitásait.
- A születést, gyerekkort, bántalmazást, szolgálói éveket, színházi pályakezdést és a házassági ultimátumot.
- Minden állítást, kapcsolatot, eseményt, időbeli sort, attribúciót és összehasonlítást.
- A 1850/1926 dátumokat és a további életkori/történelmi időpontokat.

### ROSSZUL ÉRTETTE / ROSSZUL KÖTÖTTE

- A `Kereste` közönséges igét szervezetként kezelte.
- A 16 éves említést nem kötötte Jászai Marihoz vagy az őrmesterhez.

### NEM ALÁTÁMASZTOTT

- Nem keletkezett nem alátámasztott claim.
- Egy nem alátámasztott **entitás** viszont keletkezett: `Kereste` mint organization.

### DUPLIKÁCIÓ

- Strukturált kimeneti duplikáció: 0.

### EMBERI ELLENŐRZÉST IGÉNYEL

- A teljes cikk szemantikai lefedettsége emberi feldolgozást igényel; a gépi outputból nem dönthető el attribúció, modalitás, tagadás, időpont vagy eseménykapcsolat.

## Biztonsági audit

| Ellenőrzött kockázat | Eredmény |
|---|---|
| Szám rossz subjecthez kötése | A 16 éves értékhez nincs subject; **lefutási lefedettségi hiba**, nem tévesen bizonyított subject. |
| Delta abszolút értékké alakítása | Nem fordult elő, delta nem készült. |
| Comparison actual observationként | Nem fordult elő, comparison nem készült. |
| Múlt/jelen/jövő összemosása | Nem mérhető; időbeli claim/event nem készült. |
| Becsülés tényként | Nem fordult elő; claim nem készült. |
| Vélemény tényként | Nem fordult elő; claim nem készült. |
| Attribúció elvesztése | A teljes cikk attribúciói kimaradtak; a megőrzés nem tesztelhető. |
| Tagadás elvesztése | A `Nem mond le` és más tagadó részek nem kerültek claimbe. |
| Feltétel elvesztése | A „feltétellel, hogy lemond a színpadról” nem került strukturált eredménybe. |
| Hamis relation | A `Kereste` entitás false positive; kapcsolat nem készült. |
| Hamis event | Nem készült esemény. |
| Hamis konfliktus | Nem készült konfliktus. |
| Evidence offset hiba | 0/0 span; offset-failure nincs. |

## Mérőszámok

Egyetlen cikkből ezek leíró baseline-mutatók, nem általános pontossági becslések.

| Mutató | Eredmény |
|---|---|
| Important entity coverage | **WEAK** – a központi entitások 0/érdemi készlete strukturálódott; egy false-positive entitás készült. |
| Valid relation count | 0 |
| Important relation coverage | **WEAK** |
| Important claim coverage | **WEAK** |
| Critical fact coverage | **WEAK** |
| Event precision | **PARTIAL** – nincs kibocsátott event, ezért precision érdemben nem becsülhető. |
| Temporal understanding | **WEAK** |
| Attribution correctness | **PARTIAL** – nincs kibocsátott attribútált claim, ezért nem igazolható. |
| Negation preservation | **PARTIAL** – nincs claim, amelyen tesztelhető lenne. |
| Modality preservation | **PARTIAL** – nincs claim, amelyen tesztelhető lenne. |
| Evidence correctness | **PASS, vacuous** – 0/0 persisted claim/change span. |
| Raw evidence offset correctness | **PASS, vacuous** – 0 failure 0 span mellett. |
| Unsupported claim count | 0 |
| False conflict count | 0 |
| Duplicate count | 0 |

## REAL_WORLD_002_FINDINGS

| ID | Severity | Generalizable | Finding | Likely root cause | Affected module | Status |
|---|---|---|---|---|---|---|
| R002-001 | High | Yes | A közönséges `Kereste` ige szervezetként jelent meg. | Túl tág szervezet/név felismerési szabály mondatközi vagy mondatkezdő tokenre. | `lib/v2/deterministic-semantic.js` | OBSERVED – ebben a körben nincs javítás. |
| R002-002 | High | Yes | Életrajzi/narratív cikken nem készült claim, relation vagy event. | A jelenlegi deterministic extractor szabályai főként explicit numerikus és benchmark-mintákra támaszkodnak; általános narratív esemény- és claim-kivetítés hiányos. | `lib/v2/deterministic-semantic.js`, `lib/v22/deterministic-text-provider.cjs` | OBSERVED – ebben a körben nincs javítás. |
| R002-003 | High | Yes | A 16 éves érték nem kapott subject-, esemény- vagy bizonyítékkapcsolatot. | A numeric mention útvonal önmagában adja vissza a számot, de nincs általános helyi szerep- és eseménybinding. | `lib/v2/deterministic-semantic.js` | OBSERVED – ebben a körben nincs javítás. |
| R002-004 | Medium | Yes | A születési és történelmi dátumok nem jelentek meg strukturált időadatként. | A date extraction nem fed le minden magyar életrajzi dátummondatot és markdown/article-wrapper formátumot. | `lib/v2/deterministic-semantic.js` | OBSERVED – ebben a körben nincs javítás. |
| R002-005 | Medium | Yes | A nulla claim/change miatt az evidence safety csak vacuous passként mérhető. | Nincs külön coverage-health jelzés arra, ha a rendszer teljes tartalmi absztinenciával kerüli el az evidence hibát. | `lib/v22/deterministic-text-provider.cjs` és mérési harness | OBSERVED – ebben a körben nincs javítás. |

Ezek megfigyelt findingek; az első vakteszt után sem intelligence-kódot, sem regexet, sem benchmarkot nem módosítottam.

## Generalizációs összevetés

| Futás | Entitás | Numerikus | Claim | Kapcsolat | Esemény | Változás | Konfliktus | Evidence span |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| #001 original blind baseline | 3 | 0 | 2 | 0 | 0 | 0 | 0 | 2 claim span |
| #001 final hardened result | 8 | 21 | 10 | 1 | 7 | 3 | 0 | 13 |
| #002 blind baseline | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

Az #001-ből származó bizonyíték- és temporal-hardening szabályok ebben a futásban nem aktiválódtak, mert a #002 provider nem adott vissza claimet vagy változást. Ezért a mérhető átviteli eredmény nem a semantikai generalizáció bizonyítéka, hanem egy erős domain-szűk működési korlát: a motor a járműjogi cikkhez képest a történelmi életrajzi cikken nem talált általánosítható állítási és eseményszerkezetet.

## Végső besorolás

`REAL WORLD ARTICLE #002: FAIL`

`EVIDENCE SAFETY: PASS` – 0/0 persisted span; vacuous pass.

`UNSUPPORTED CLAIM SAFETY: PASS` – 0 claim készült, de ez nem jelent jó coverage-et.

`ATTRIBUTION SAFETY: PARTIAL`

`TEMPORAL UNDERSTANDING: WEAK`

`CLAIM COVERAGE: WEAK`

`ENTITY/RELATION COVERAGE: WEAK`

`EVENT PRECISION: PARTIAL`

`FALSE CONFLICT SAFETY: PASS` – 0 konfliktus, ezért a konfliktusútvonal nem volt érdemben exercizálva.

### Legjobb öt megfigyelés

Nincs öt érdemi, helyes szemantikai megértés. A vak baseline egyetlen részben helyes eleme a `16 éves` numerikus felszíni felismerése. A többi pozitív biztonsági jelzés – 0 unsupported claim, 0 false conflict, 0 evidence-offset failure – az állításképzés teljes hiányából következik.

### Legfontosabb öt kihagyás

1. Jászai Mari mint központi személy és a hozzá kötött születési életrajz.
2. A családi bántalmazás, szolgálói évek és erőszakos események attribúciója.
3. A königgrätzi csata, sebesültmentés, kitüntetés és színészi pályára lépés idővonala.
4. Hubay társulata, a Budai Népszínház/Népszínház és a színházi pálya kapcsolatai.
5. A Népszínház vezetőjének feltételes házassági ajánlata és Jászai Mari „Nem mond le” válasza.

### Legveszélyesebb félreértések

- A `Kereste` false-positive szervezetként jelenik meg.
- A központi személy hiánya miatt a 16 éves számnak nincs alanya.
- A nulla claim/event output hamisan keltheti azt a benyomást, hogy a cikk nem tartalmaz strukturálható tényeket.

### Összes nem alátámasztott állítás

Nincs kibocsátott nem alátámasztott **claim**. Egy nem alátámasztott entity van: `Kereste` mint organization.

### Összes téves konfliktus

Nincs.

### Következő fejlesztési körre javasolt általános hibacsoportok

- biztonságos, kontextusfüggő személy-, hely- és szervezetfelismerés;
- magyar életrajzi és narratív dátumok strukturálása;
- numerikus említések subject-, szerep- és eseménybindingja;
- forrásalapú narratív claim/event/attribution projection;
- absztinencia és coverage külön mérésének bevezetése, hogy a vacuous evidence pass ne legyen összetéveszthető a tartalmi sikerrel.

## Tesztkorlátozások és megfelelés

- A REAL_WORLD_ARTICLE_001 nem került fejlesztési inputként felhasználásra; csak a három baseline eredmény összehasonlítására szerepel.
- A #002 első raw eredményét nem írtam felül.
- Intelligence-kód, regex, extractor, provider, benchmark és cikk-specifikus szabály nem változott.
- Nem történt commit, push, production- vagy production DB-művelet.
- Paid AI calls: 0; external AI/provider calls: 0.
- A #002 first-pass eredmény tulajdonosi és műszaki felülvizsgálatra visszaadandó; ebben a körben javítás nem történt.
