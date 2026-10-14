# REAL_WORLD_ARTICLE_003 – első vak futás emberi auditja

## Mérési keret és befagyasztás

- Tesztazonosító: `REAL_WORLD_ARTICLE_003`
- Bemenet: `docs/UTOM_V2_2/real_world/003_source_article.txt`
- Bemeneti SHA-256: `11541E921B4BE74139B7903D31BBAA2AB5995CBD0EAAA17FDC2281750FCBFD2E`
- First-pass raw: `docs/UTOM_V2_2/real_world/003_first_pass_raw.json`
- First-pass SHA-256: `5041BED367359EE18D7E9576FC6F6383D962F2F7D2E2A72DF2D8A76B66FA96B6`
- State freeze: `docs/UTOM_V2_2/real_world/003_state_freeze.json`
- Branch: `develop/utom-recovery`
- Local HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Remote HEAD: `d145120c6e044b4f25d1d7b94e87846652ef80ba`
- Az intelligenciafájlok hash-ei megegyeznek a state freeze-ben rögzített értékekkel.
- A futás kizárólag a jelenlegi determinisztikus provider útján történt. Production, production DB, paid AI és külső provider nem érintett.
- A first pass előtt és után nem módosult intelligence-kód, regex, extractor, benchmark vagy cikk-specifikus szabály.
- A user-owned `AGENTS.md`, `CLAUDE.md` és `docs.zip` érintetlen maradt.

## Vak first-pass eredmény

| Réteg | Darab |
|---|---:|
| Entitás | 3 |
| Numerikus említés | 8 |
| Állítás | 1 |
| Kapcsolat | 0 |
| Esemény | 1 |
| From→to változás | 0 |
| Konfliktus | 0 |
| Omisszió-jelzés | 0 |

### Entitások

| Raw mention | Normalizált név | Típus | Emberi értékelés |
|---|---|---|---|
| `Flávio Bolsonaro Brazíliavárosban` | `flávio bolsonaro brazíliavárosban` | location | **ROSSZUL ÉRTETTE** – személy és hely egyetlen location entitássá olvadt. |
| `Guardian` | `guardian` | person | **ROSSZUL ÉRTETTE** – sajtóforrásként/szervezetként jelenik meg, nem személyként. |
| `CNN` | `cnn` | person | **ROSSZUL ÉRTETTE** – sajtóforrásként/szervezetként jelenik meg, nem személyként. |

Nem jelent meg strukturált entitásként Flávio Bolsonaro, Jair Bolsonaro, Luiz Inácio Lula da Silva, a Liberális Párt, a Munkáspárt, Brazília, Donald Trump, Banco Master, a Reuters, a Politico, Carlos Bolsonaro, Michelle Bolsonaro, Jair Renan, Eduardo Bolsonaro, Laura, valamint a cikkben szereplő brazil és amerikai helyszínek.

### Numerikus említések

| Raw | Érték | Egység | Emberi értékelés |
|---|---:|---|---|
| `több mint 12` | 12 | number | A lower-bound jelölés megmaradt, de nincs szavazat- vagy népesség-subject. |
| `50 százalék` | 50 | % | Nem kötődött ahhoz, hogy egyik jelölt sem érte el az első fordulós többséget. |
| `45 éves` | 45 | year | Nem kötődött megbízhatóan Flávio Bolsonaróhoz. |
| `27 éves` | 27 | year | Nem kötődött Jair Bolsonaro büntetéséhez; az érték helyesen jelenik meg, de kontextus nélkül. |
| `45 éves` | 45 | year | A második előfordulás sem kapott subjectet. |
| `16 éves` | 16 | year | Nem kötődött Laurához. |
| `50 százalékos` | 50 | % | Nem kötődött a Trump által kivetett vámhoz. |
| `31 éves` | 31 | year | Nem kötődött Italo Andrade dos Santoshoz. |

Kimaradtak többek között a 47,3%, 45,16%, 7,5%, 56,1 millió, 53,9 millió, 2,1%, 2,2%, 5,3 millió, 80 éves, 21%, 159 millió, 4 százalékpont, 2022, 2023, 2025, 1989, október 25., három hét és négy év értékek.

### Állítás

Az egyetlen claim:

| Predicate | Value | Evidence | Értékelés |
|---|---|---|---|
| `PROJECT_START` | `szeptember` | „Flávio Bolsonaro ellen szeptemberben korrupció és pénzmosás gyanúja miatt indult ellene eljárás.” | **ROSSZUL ÉRTETTE** – ez nem projekt kezdete, hanem egy korrupciós/pénzmosási eljárás megindulása. A subject null, az eljárás típusa és az attribúció elveszett. A `modality: unknown` és `uncertainty: true` sem tükrözi pontosan a szerkesztői tényállítást. |

Az evidence szövege valóban alátámasztja, hogy szeptemberben eljárás indult, ezért ez nem teljesen unsupported claim, hanem hibás predicate- és szerepkiosztás.

### Attribúció, modalitás, feltételesség, tagadás

A cikk számos attribútált vagy bizonytalan eleme nem került claimbe:

- Guardian, CNN, Reuters és Politico forrásmegjelölései;
- Lula véleményei és idézetei;
- rendőrségi állítások;
- Flávio Bolsonaro és Jair Bolsonaro saját ígéretei/állításai;
- a „ha elnökké választják” feltétel;
- a „szerinte”, „állítják”, „gyanúja miatt” bizonytalansági szintek;
- a „tagadta, hogy jogsértést követett volna” tagadás.

### Események és idővonal

Az egyetlen event:

| Event | Evidence | Participants | Értékelés |
|---|---|---|---|
| `Bírósági döntés` | „Az ifjabb Bolsonaro ... bosszút is állna a szerintük alaptalanul meghozott ítélet miatt.” | üres | **PARTIALLY WRONG** – az „ítélet” szó alapján általános bírósági eseményt vetít ki, de nem azonosítja, melyik döntésről van szó, mikor született, ki hozta, és az evidence a bosszúígéretet írja le, nem magát a döntés eseményét. |

Nem készült idővonal az első fordulóról, a három héttel későbbi második fordulóról, a 2022-es puccskísérletről, a 2023-as kongresszusi és legfelsőbb bírósági betörésről, a szeptemberi eljárásról, a 2025-ös vámról, az október 25-i fordulóról, illetve a jövő évi kormányváltási lehetőségről.

### From→to, delta és összehasonlítás

Nem készült változás, delta vagy comparison. Emiatt nem strukturálódott például:

- Flávio 47,3%-os és Lula 45,16%-os eredménye;
- a felmérésekhez képesti jobb teljesítmény;
- a 2022-es eredményhez képesti négy százalékpontos növekedés;
- az első és második forduló közötti lehetséges támogatói átrendeződés.

### Konfliktusok és false-conflict check

- Észlelt konfliktus: 0.
- Automatikus winner: nincs.
- False conflict: 0.

Ez nem bizonyítja a konfliktuskezelés helyességét; a motor nem strukturálta azokat a választási, közvélemény-kutatási és múltbeli eredményadatokat, amelyek között eltérést lehetett volna vizsgálni.

## Evidence integrity

| Ellenőrzés | Darab |
|---|---:|
| Persisted claim/change evidence span | 1 |
| Exact `rawSource.slice(start,end) === evidenceSpan.textSpan` | 1 |
| Offset-failure | 0 |

`EVIDENCE SAFETY: PASS` – a claim egyetlen evidence spanja karakter szerint egyezik a raw inputtal. A szemantikai predicate viszont hibás, ezért az evidence offset PASS nem jelent claim-semantics PASS-t.

## Utólagos emberi audit

### HELYESEN FELISMERTE

- A `több mint 12` alsó korlát jellegű numerikus felszínt.
- Több százalék- és életkor-kifejezést felszíni számként.
- A szeptemberi eljárásmondat raw evidence szövegét pontosan.

### KIHAGYTA

- A központi szereplőket és a pártokat.
- A választási eredmények és a felmérések összevetését.
- A második forduló, kegyelem/amnesztia, korrupciós eljárás, puccskísérlet és külpolitikai szál eseményeit.
- Az idézeteket, forrás-attribúciókat, feltételeket, tagadásokat és modalitásokat.

### ROSSZUL ÉRTETTE / ROSSZUL KÖTÖTTE

- `Flávio Bolsonaro Brazíliavárosban` locationként, személy és hely összefűzésével.
- Guardian és CNN personként.
- `PROJECT_START`-ként a korrupciós eljárás megindulását.
- `Bírósági döntés` eseményként egy kontextus nélküli ítélet-említést.
- Az összes kinyert szám subject és esemény nélkül maradt.

### NEM ALÁTÁMASZTOTT

- A claim evidence-alapú, ezért truly unsupported claim: 0.
- A `Bírósági döntés` event szemantikai általánosítása nem kellően alátámasztott; ezt false/overgeneralized eventként kell kezelni.

### DUPLIKÁCIÓ

- Strukturált claim- vagy relation-duplikáció: 0.
- A fotó/meta sorok és a cikk törzsszövegének duplikált részei bemeneti markupként jelen vannak, de a provider nem vetített belőlük külön duplikált rekordot.

### EMBERI ELLENŐRZÉST IGÉNYEL

- A teljes politikai eseménylánc, az idézett állítások, a korrupciós gyanú és a történelmi előzmények mind emberi ellenőrzést igényelnek, mert a gépi output csak egy részleges claimet és egy bizonytalan eventet adott.

## Biztonsági audit

| Kockázat | Eredmény |
|---|---|
| Szám rossz subjecthez kötése | **Igen, lefedettségi/kötési hiba** – mind a 8 szám subject nélkül maradt. |
| Delta abszolút értékké alakítása | Nem történt, delta nem készült. |
| Comparison actual observationként | Nem történt, comparison nem készült. |
| Múlt/jelen/jövő összemosása | Nem történt közvetlen projection, de idővonal sem készült. |
| Becsülés tényként | A „várható”, „reménykedik”, „ha” és „szerinte” elemek nem kerültek claimbe; megőrzésük nem bizonyítható. |
| Vélemény tényként | Nem készült erre külön claim, de a vélemények elvesztek. |
| Attribúció elvesztése | **Igen** – források, rendőrségi állítások, Lula- és Bolsonaro-állítások kimaradtak. |
| Tagadás elvesztése | **Igen** – például „tagadta, hogy jogsértést követett volna” nem strukturálódott. |
| Feltétel elvesztése | **Igen** – „ha elnökké választják” nem került a kegyelmi ígéret feltételéhez. |
| Hamis relation | Entitáskapcsolat nem készült; a típushibás entityk tévesek. |
| Hamis event | **1 gyengén alátámasztott/overgeneralized event**. |
| Hamis konfliktus | 0. |
| Evidence offset hiba | 0/1. |

## Mérőszámok

Egyetlen cikkből ezek leíró baseline-mutatók, nem általános pontossági százalékok.

| Mutató | Eredmény |
|---|---|
| Important entity coverage | **WEAK** |
| Valid relation count | 0 |
| Important relation coverage | **WEAK** |
| Important claim coverage | **WEAK** |
| Critical fact coverage | **WEAK** |
| Event precision | **PARTIAL** – 1 event készült, de a típus és az evidence kapcsolat nem elég pontos. |
| Temporal understanding | **WEAK** |
| Attribution correctness | **PARTIAL** – az egyetlen claim nem attribútált, a cikk attribúciói kimaradtak. |
| Negation preservation | **PARTIAL** – tagadó állítás nem került claimbe. |
| Modality preservation | **PARTIAL** – a claim `unknown/uncertainty` értékei nem felelnek meg a teljes mondat szemantikájának, a többi modalitás kimaradt. |
| Evidence correctness | **PASS** a raw span szintjén; a claim predicate szemantikailag hibás. |
| Raw evidence offset correctness | **PASS**, 1/1. |
| Unsupported claim count | 0 |
| False/overgeneralized event count | 1 |
| False conflict count | 0 |
| Duplicate count | 0 |

## REAL_WORLD_003_FINDINGS

| ID | Severity | Generalizable | Finding | Likely root cause | Affected module | Status |
|---|---|---|---|---|---|---|
| R003-001 | High | Yes | A személyt és a helyet egyetlen `location` entitássá fűzte (`Flávio Bolsonaro Brazíliavárosban`). | A név- és helyfelismerési szabály nem választja le biztonságosan a személynevet a helyhatározóról. | `lib/v2/deterministic-semantic.js` | OBSERVED – nincs javítás ebben a körben. |
| R003-002 | High | Yes | A Guardian és CNN sajtóforrást personként ismerte fel. | Túl tág tulajdonnév/person heuristika és hiányos forrástípus-normalizáció. | `lib/v2/deterministic-semantic.js` | OBSERVED – nincs javítás ebben a körben. |
| R003-003 | High | Yes | A korrupciós/pénzmosási eljárás megindulása `PROJECT_START` claimként jelent meg subject nélkül. | A dátum- és projekt-start szabály túl széles, a jogi eljárás esemény/predicate-sémája hiányos. | `lib/v2/deterministic-semantic.js` | OBSERVED – nincs javítás ebben a körben. |
| R003-004 | High | Yes | Egy kontextus nélküli `ítélet` említésből `Bírósági döntés` event készült résztvevők és időpont nélkül. | Kulcsszó-alapú event fallback, amely nem követeli meg az esemény alanyát, dátumát és konkrét bizonyítékát. | `lib/v22/deterministic-text-provider.cjs` | OBSERVED – nincs javítás ebben a körben. |
| R003-005 | High | Yes | A választási eredmények, kegyelmi ígéret, kampány, jogi és külpolitikai állítások túlnyomó része kimaradt. | A jelenlegi deterministic extractor nem általános narratív politikai claim/event/relationship modell. | `lib/v2/deterministic-semantic.js`, `lib/v22/deterministic-text-provider.cjs` | OBSERVED – nincs javítás ebben a körben. |
| R003-006 | Medium | Yes | A numerikus említések subject és idő nélkül maradnak, a fontos százalékok és összehasonlítások nagy része kimarad. | Numeric extraction korlátozott mintakészlete és hiányzó lokális semantic binding. | `lib/v2/deterministic-semantic.js` | OBSERVED – nincs javítás ebben a körben. |

Ezek megfigyelt findingek; ebben a vaktesztben semmilyen javítás nem történt.

## Generalizációs összevetés

| Futás | Entitás | Numerikus | Claim | Kapcsolat | Esemény | Változás | Konfliktus | Evidence span |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| #001 original blind baseline | 3 | 0 | 2 | 0 | 0 | 0 | 0 | 2 |
| #001 final hardened result | 8 | 21 | 10 | 1 | 7 | 3 | 0 | 13 |
| #002 blind baseline | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| #003 blind baseline | 3 | 8 | 1 | 0 | 1 | 0 | 0 | 1 |

A #003 több felszíni számot és egy evidence-safety szempontból pontos claimet adott, mint a #002, de a #001 végleges hardening eredményének általános narratív és politikai lefedettségét nem reprodukálta. A #001-ből származó raw-offset javítás működött az egyetlen claimen (`1/1`), miközben az attribúció, a subject binding, a választási összehasonlítások és a feltételes ígéret nem generalizálódtak.

## Végső besorolás

`REAL WORLD ARTICLE #003: FAIL`

`EVIDENCE SAFETY: PASS` – 1/1 raw evidence offset pontos.

`UNSUPPORTED CLAIM SAFETY: PASS` – truly unsupported claim: 0; az event projection viszont gyenge/overgeneralized.

`ATTRIBUTION SAFETY: PARTIAL`

`TEMPORAL UNDERSTANDING: WEAK`

`CLAIM COVERAGE: WEAK`

`ENTITY/RELATION COVERAGE: WEAK`

`EVENT PRECISION: PARTIAL`

`FALSE CONFLICT SAFETY: PASS` – 0 konfliktus, így az útvonal korlátozottan volt mérhető.

### Legjobb öt dolog, amit helyesen vagy részben helyesen értett meg

1. A `több mint 12` kifejezést lower-bound értékként kezelte.
2. Több életkori és százalékos felszíni számot kinyert.
3. A szeptemberi eljárás mondatát evidence-ként karakterpontosan megőrizte.
4. A claim időmezőjében a szeptembert `09` hónapként normalizálta.
5. Nem gyártott automatikus konfliktust vagy winner-t a hiányos kimenetből.

### Legfontosabb öt kihagyás

1. Flávio Bolsonaro és Jair Bolsonaro központi személyi és családi kapcsolatai.
2. A 47,3%–45,16% választási eredmény és a felmérésekhez viszonyított változás.
3. A kegyelem/amnesztia feltételes ígérete és a 27 éves büntetés.
4. A korrupciós ügy, banki kapcsolat, rendőrségi nyomozás és jogi attribúciók.
5. A Trump–Lula–Bolsonaro külpolitikai és választási befolyásolási szál.

### Legveszélyesebb félreértések

- A `PROJECT_START` predicate egy jogi eljárást projektként címkéz.
- A `Bírósági döntés` event egy általános „ítélet” említésből, résztvevők és időpont nélkül születik.
- A központi politikusok hiánya miatt a kinyert számok és a claim nem kötődnek megbízható alanyhoz.
- A feltételes kegyelmi ígéret és a tagadott jogsértés elvesztése a jogi jelentés torzulásának kockázatát hordozza.

### Összes nem alátámasztott állítás

Truly unsupported claim: 0. A `Bírósági döntés` event szemantikailag overgeneralized, ezért nem tekinthető megbízható eseménykivetítésnek.

### Összes téves konfliktus

Nincs.

### Következő fejlesztési körre javasolt általános hibacsoportok

- személy/hely/sajtóforrás entitástípusok biztonságos szétválasztása;
- jogi eljárás és bírósági döntés külön esemény- és claim-sémája;
- numeric subject/time/role binding;
- politikai választási eredmény, várakozás és delta kezelése;
- feltételes ígéret, tagadás és forrás-attribúció megőrzése;
- event fallback csak explicit alany-, idő- és evidence-kapcsolattal.

## Megfelelés

- A #003 first-pass eredményét nem írtam felül.
- Nem módosítottam intelligence-kódot, regexet, extractort, providert vagy benchmarkot.
- Nem commitoltam és nem pusholtam.
- Production és production DB érintetlen.
- Paid AI calls: 0; external provider calls: 0.
- A #003 eredmény tulajdonosi és műszaki felülvizsgálatra visszaadandó; ebben a körben nincs javítás.
