# Temporal / ordinal research checkpoint

2026-10-09 · develop/utom-recovery · research-only · canonical projection OFF

## Reprodukció és gyökérok

A korábbi numeric réteg unit-szótár alapján durationnak tekintette a `9 órakor`
szerkezetet; a `75 percig` generikus count lett. A többtokenes dátumokat és a
sorszámokat nem reprezentálta. A hiányzó réteg a calendar NP, Case, postposition,
governing predicate és dependency út együttes értelmezése volt.

23 új, általánosított mondat valódi helyi HuSpaCy worker-annotációját őriztük meg.
Nem fizetős API és nem kézzel átírt parserkimenet. A külön negatív tesztek
kontrollált input/annotation mutációk. Az előző candidate/dependency munkát nem
terveztük újra és nem állítottuk vissza.

## Szabályok és reprezentáció

- Calendar date strukturált `{year, month, day, part}`: a hiányzó komponens
  null marad. A month/year/day kapcsolatot dependency igazolja; a puszta
  négyjegyű szám nem calendar year. A year/count korábbi regresszió megmaradt.
- Teljes és részleges dátum, ragos nap, év+hónap és hónap eleje/vége külön
  calendar argumentum. Calendar érvényesség is szükséges. A névszói dátum
  copula-kapcsolatát külön, explicit reverse cop edge igazolja.
- Clock time `{hour, minute}`: Tem/-kor vagy strukturálisan bizonyított
  nyitvatartási boundary. Óra/perc tartományellenőrzés, nincs kitalált timezone.
- Calendar/weekday/clock boundary külön temporalRole; nem duration. A -ig
  önmagában nem határozza meg a numerikus szerepet.
- Duration: NUM → unit + case/postposition + predicate út. Év/hét/nap/óra/perc;
  át/keresztül/alatt kapcsolatok, ragos időtartam és lokális compound órás/napos/
  hetes modifier. Az `óráig dolgozott` ambiguous; a durationt kifejező
  subjecttel álló `késés … óráig tartott` megtartja a korábbi biztos kötést.
- Ordinal: NumType=Ord + amod → noun. A kerület/forduló nem rangsorhely.
  Rankhoz hely + megfelelő governing placement predicate kell. A puszta
  `harmadik lett` nincs automatikusan rangsorként feloldva.
- Temporal correction a korábbi contrast representationt használja. Az
  accepted dátum saját temporal és dependency bizonyítékot igényel; rejected
  dátum nem kerül pozitív numeric outputba. Source chain külön marad.
- Resolved argumenthez raw span, frame ID, semanticKind, temporalRole,
  dependencyPath, resolutionStatus és rule tartozik. Hibás temporal attachment
  nem törli a külön bizonyított actort.

A hónap-/szám-/időegység-táblák értékdekódolók, nem pozitív kötési szabályok.
Nincs cikk-, fixture-mondat- vagy proper-name-specifikus feltétel.

## Változott fájlok

- scripts/experimental/temporal-binding.cjs (új research helper)
- scripts/experimental/dependency-binding.cjs
- scripts/experimental/contrast-correction.cjs
- tests/fixtures/real-text-a/temporal-annotations.json
- tests/unit/v22-temporal-binding.test.cjs
- docs/UTOM_V2_2/real_text_round_a/07_temporal_results.json
- ez a checkpoint

## Validáció

A korábbi 198 teszt megőrizve, tesztelvárásuk nem módosult.
27 új regressziós teszt: full/bare/partial/month/part date; clock; calendar és
weekday deadline/boundary; nyitvatartás; ragos duration; ambiguous -ig;
ordinal/rank; mixed date+clock+duration; contrast; nested attribution;
disconnected dependency; invalid clock/date; independent actor preservation;
exact evidence és canonical OFF.

Az összes `tests/unit/v22-*.test.cjs` futott: **225/225 PASS, 0 FAIL, 0 SKIP**.
Nem teljes projekt-suite. Production build/preflight, deploy, commit, push és
fizetős agenthálózat nem futott. Production kódhoz nem nyúltunk.

A 23 valódi annotáció teljes research kimenete a 07_temporal_results.json-ban,
fixture SHA-256-tal és mechanikai evidence-ellenőrzéssel. Ez nem új vakteszt.

## Státusz és korlátok

DATE: PASS a tesztelt explicit calendar szerkezeteken.
CLOCK_TIME: PASS a tesztelt explicit time szerkezeteken.
DEADLINE/DURATION: PASS a tesztelt elkülönítésen, ambiguity → unresolved.
ORDINAL/RANK: PARTIAL. Az explicit hely+predicate működik, a copulás
helyezés (`harmadik lett`) és tágabb rangsorkontextus nem bizonyított.

Temporal blokk összesen: PARTIAL. További dátumformátumok, intervallumok,
relatív dátumok, szélesebb számnévragozás és discourse-alapú időpontfeloldás
nincs lezárva. Bizonytalan rang/óra szerepnél nem választunk pozitív értelmezést.
EVIDENCE: PASS a célzott fixture-ökön; SEMANTIC ENTAILMENT: NOT YET VERIFIED.
Actor/attribution/numeric/logical-scope globális státusz továbbra is PARTIAL.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

Következő egyetlen blokk: copulás ordinal/rank szerep pozitív kontextusának
bizonyítása; `harmadik lett` vs nem-rangsorbeli sorszám kontrasztjai.
