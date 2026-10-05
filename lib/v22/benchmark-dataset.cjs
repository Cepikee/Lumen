"use strict";

const SOURCES = Object.freeze([
  { key: "telex.hu", label: "Telex-szerű" },
  { key: "24.hu", label: "24.hu-szerű" },
  { key: "index.hu", label: "Index-szerű" },
  { key: "hvg.hu", label: "HVG-szerű" },
]);

const FILLER = [
  "A helyszínen készült beszámoló a döntés hátterét és a következő lépéseket is ismerteti.",
  "A szerkesztőség a nyilvánosan ellenőrizhető adatokat külön választja a szereplők állításaitól.",
  "A részletek között szerepelnek időpontok, felelősök, költségvetési tételek és a lakosságot érintő következmények.",
  "A közlemények és az interjúk eltérő hangsúlyai miatt az olvasónak érdemes a bizonyítékok eredetét is figyelnie.",
  "A projekt következő állomásáról később újabb hivatalos tájékoztatás várható.",
  "A beszámoló nem tekinti lezártnak azokat a kérdéseket, amelyekhez még nincs elsődleges dokumentum.",
  "A helyi szereplők szerint a gyakorlati megvalósítás több egymást követő döntéstől függ.",
  "A cikkben közölt információk kizárólag a saját készítésű benchmark részei.",
  "A nyilvános adatok mellett több állítás csak a megszólaló forrás megjelölésével szerepel.",
  "A változások hatását a következő hetekben új mérések és beszámolók mutathatják meg.",
  "A szerkesztők a bizonytalan részleteket feltételes vagy ismeretlen állapotban hagyták.",
  "A történetben szereplő személyek és intézmények nevei kontrollált tesztadatok.",
  "Az összevetés célja annak megmutatása, hogy azonosnak látszó mondatok eltérő jelentést hordozhatnak.",
  "A források közötti különbség önmagában nem bizonyítja egyik állítás igazát sem.",
  "A későbbi korrekciók és új adatok külön eseményként maradnak visszakereshetők.",
  "A cikk végén az olvasó megtalálja a témához tartozó dokumentumok és nyilatkozatok rövid leírását.",
  "A közös tényeket és a csak egy forrásban megjelenő részleteket a benchmark külön jelöli.",
  "A dátumoknál a közlés, a megfigyelés és a tervezett érvényesség ideje nem ugyanaz.",
  "A szereplők kijelentéseit a rendszer nem alakíthatja át saját tényállítássá.",
  "A forrásanyag minden mondata magyar nyelvű, saját készítésű és nem valós újságcikk átvétele.",
];

function observation(source, sentence, evidence, value, options = {}) {
  return { source, sentence, evidence, value, unit: options.unit ?? null, attribution: options.attribution ?? null, modality: options.modality ?? "asserted", polarity: options.polarity ?? "affirmed", uncertainty: options.uncertainty === true, conditional: options.conditional === true, temporal: options.temporal ?? null, scope: options.scope ?? null, correctionOf: options.correctionOf ?? null, eventId: options.eventId ?? null };
}

function variant(key, angle, observations) {
  return { source: SOURCES.find((item) => item.key === key) || { key, label: key }, angle, observations };
}

const DEFAULT_PREDICATES = Object.freeze({
  "numeric-disagreement": "PROJECT_COST",
  "same-number-different-semantics": "PROJECT_COST",
  "percentage-disagreement": "COMPLETION_PERCENT",
  "unit-conversion": "DISTANCE",
  "date-time-disagreement": "OPENING_DATE",
  "plan-vs-completed": "OPENING_EVENT",
  "conditional-future": "CONSTRUCTION_START",
  "direct-denial": "INJURY_OCCURRED",
  "partial-denial": "DAMAGE_SCOPE",
  "uncertain-claim": "INCIDENT_CAUSE",
  "anonymous-attribution": "RELOCATION_PLAN",
  "official-attribution": "FUNDING_STATUS",
  "quote-vs-journalist": "PUBLIC_CONFIDENCE",
  "entity-namesake": "ROLE",
  "entity-type-ambiguity": "IDENTITY_CONTEXT",
  "changed-plan-over-time": "PROJECT_START",
  "source-omission": "GRANT_AMOUNT",
  "common-and-source-specific": "BUS_PURCHASE",
  "corrected-information": "PROJECT_COST",
  "multi-event": "EVENT_STATUS",
});

function predicateFor(blueprint, sourceVariant, item) {
  const text = item.sentence.toLowerCase();
  if (blueprint.slug === "same-number-different-semantics") return sourceVariant.source.key === "telex.hu" ? "SUBSIDY_AMOUNT" : "PROJECT_COST";
  if (blueprint.slug === "common-and-source-specific" && text.includes("kerékpártároló")) return "BIKE_RACK";
  if (blueprint.slug === "entity-namesake") return "PERSON_ROLE";
  return DEFAULT_PREDICATES[blueprint.slug] || "UNSPECIFIED_CLAIM";
}

const BLUEPRINTS = [
  {
    id: "V22-S01", slug: "numeric-disagreement", category: "numeric disagreement", title: "Eltérő összegek ugyanahhoz a beruházáshoz",
    variants: [
      variant("telex.hu", "A támogatási keret összegét vizsgálja.", [observation("telex.hu", "A program támogatási kerete 120 millió forint.", "120 millió forint", 120, { unit: "million HUF" })]),
      variant("24.hu", "A teljes projektköltségről közöl adatot.", [observation("24.hu", "A teljes projekt költsége 150 millió forint.", "150 millió forint", 150, { unit: "million HUF" })]),
      variant("index.hu", "A megvalósítás ütemét ismerteti összeg nélkül.", []),
    ],
    entities: [{ id: "project", mention: "Tiszapart mérőállomás", type: "project", identity: "same" }],
    conflicts: [{ type: "numeric", claims: ["telex.hu", "24.hu"], explanation: "A két forrás azonos projekthez eltérő összeget közöl; a költségfogalom azonossága nem bizonyított." }],
    omissions: [{ source: "index.hu", predicate: "PROJECT_COST" }],
  },
  {
    id: "V22-S02", slug: "same-number-different-semantics", category: "same number, different semantic meaning", title: "Azonos szám, eltérő költségfogalom",
    variants: [
      variant("telex.hu", "A támogatási részről ír.", [observation("telex.hu", "A pályázati támogatás összege 120 millió forint.", "támogatás összege 120 millió forint", 120, { unit: "million HUF" })]),
      variant("24.hu", "A teljes keretet bontja ki.", [observation("24.hu", "A teljes projektköltség szintén 120 millió forint, a saját forrás nélkül.", "teljes projektköltség szintén 120 millió forint", 120, { unit: "million HUF" })]),
    ],
    entities: [{ id: "project", mention: "Déli csatornaprogram", type: "project", identity: "same" }],
    nonConflicts: [{ reason: "different_predicate_semantics", claims: ["SUBSIDY_AMOUNT", "PROJECT_COST"] }],
  },
  {
    id: "V22-S03", slug: "percentage-disagreement", category: "percentage disagreement", title: "Eltérő készültségi százalékok",
    variants: [
      variant("telex.hu", "A kivitelező mérését idézi.", [observation("telex.hu", "A kivitelezés készültsége 40 százalék.", "készültsége 40 százalék", 40, { unit: "%" })]),
      variant("24.hu", "A számlázási mérföldkövet használja.", [observation("24.hu", "A számlázási mérföldkő alapján 60 százalékos a teljesítés.", "60 százalékos a teljesítés", 60, { unit: "%" })]),
      variant("hvg.hu", "A helyszíni munkát követi.", [observation("hvg.hu", "A helyszíni munkák körülbelül 45 százaléknál tartanak.", "körülbelül 45 százaléknál", 45, { unit: "%", uncertainty: true })]),
    ],
    entities: [{ id: "project", mention: "Északi vasúti csomópont", type: "project", identity: "same" }],
    conflicts: [{ type: "categorical", claims: ["telex.hu", "24.hu"], explanation: "A készültségi százalékok különböznek, a mérési módszer részben eltérhet." }],
  },
  {
    id: "V22-S04", slug: "unit-conversion", category: "unit conversion", title: "Kilométer és méter ugyanarról a távról",
    variants: [
      variant("telex.hu", "A távolságot kilométerben adja meg.", [observation("telex.hu", "A töltés új szakasza 1 kilométer hosszú.", "1 kilométer hosszú", 1, { unit: "km" })]),
      variant("index.hu", "A mérnöki dokumentum méteres mértéket használ.", [observation("index.hu", "A tervlap szerint a szakasz hossza 1000 méter.", "1000 méter", 1000, { unit: "m" })]),
    ],
    entities: [{ id: "levee", mention: "Töltésszakasz", type: "project", identity: "same" }],
    nonConflicts: [{ reason: "unit_conversion_equal", normalizedValue: "1000 m", claims: ["telex.hu", "index.hu"] }],
  },
  {
    id: "V22-S05", slug: "date-time-disagreement", category: "date/time disagreement", title: "Két eltérő megnyitási dátum",
    variants: [
      variant("telex.hu", "A június eleji átadást írja.", [observation("telex.hu", "A központot június 1-jén nyithatják meg.", "június 1-jén", "2027-06-01", { unit: "date", modality: "planned", temporal: { start: "2027-06-01" } })]),
      variant("24.hu", "A későbbi műszaki átadást emeli ki.", [observation("24.hu", "A megnyitás várható időpontja június 15.", "június 15", "2027-06-15", { unit: "date", modality: "planned", temporal: { start: "2027-06-15" } })]),
    ],
    entities: [{ id: "center", mention: "Közösségi központ", type: "project", identity: "same" }],
    conflicts: [{ type: "temporal", claims: ["telex.hu", "24.hu"], explanation: "A két forrás eltérő tervezett megnyitási dátumot közöl." }],
  },
  {
    id: "V22-S06", slug: "plan-vs-completed", category: "plan vs completed event", title: "Terv és már befejezett munka",
    variants: [
      variant("telex.hu", "A döntéskori tervet rögzíti.", [observation("telex.hu", "A park felújítását ősszel tervezik elkezdeni.", "ősszel tervezik elkezdeni", "2027 ősz", { modality: "plan" })]),
      variant("24.hu", "A már elkészült próbaszakaszról számol be.", [observation("24.hu", "A próbaszakasz felújítása már befejeződött.", "már befejeződött", true, { modality: "completed" })]),
    ],
    entities: [{ id: "park", mention: "Városi park", type: "location", identity: "same" }],
    nonConflicts: [{ reason: "different_event_state", claims: ["plan", "completed"] }],
  },
  {
    id: "V22-S07", slug: "conditional-future", category: "conditional future statement", title: "Feltételesen induló építkezés",
    variants: [
      variant("telex.hu", "A támogatási feltételt hangsúlyozza.", [observation("telex.hu", "Ha megérkezik a támogatás, megkezdődhet az építés.", "Ha megérkezik a támogatás, megkezdődhet", "construction-start", { conditional: true, modality: "conditional" })]),
      variant("index.hu", "A döntés hiányát emeli ki.", [observation("index.hu", "A kivitelezés időpontjáról még nincs végleges döntés.", "még nincs végleges döntés", "unknown", { modality: "unknown", uncertainty: true })]),
    ],
    entities: [{ id: "school", mention: "Új iskolaépület", type: "project", identity: "same" }],
    nonConflicts: [{ reason: "condition_preserved", claims: ["conditional", "unknown"] }],
  },
  {
    id: "V22-S08", slug: "direct-denial", category: "direct denial", title: "A közlemény szerint nem történt sérülés",
    variants: [
      variant("telex.hu", "A mentőszolgálat közvetlen közlését idézi.", [observation("telex.hu", "A mentőszolgálat szerint a balesetben nem történt sérülés.", "nem történt sérülés", false, { polarity: "negated", modality: "reported", attribution: { type: "official", label: "mentőszolgálat" } })]),
      variant("24.hu", "A helyszíni ellenőrzést ismerteti.", [observation("24.hu", "A rendőrség szerint személyi sérülés nem történt.", "személyi sérülés nem történt", false, { polarity: "negated", attribution: { type: "official", label: "rendőrség" } })]),
    ],
    entities: [{ id: "accident", mention: "Baleset", type: "event", identity: "same" }],
    nonConflicts: [{ reason: "same_negated_observation", claims: ["telex.hu", "24.hu"] }],
  },
  {
    id: "V22-S09", slug: "partial-denial", category: "partial denial", title: "Csak a tető sérült meg",
    variants: [
      variant("telex.hu", "A károsodás korlátozott mértékét írja le.", [observation("telex.hu", "A viharkár csak a tetőcserepeket érintette.", "csak a tetőcserepeket érintette", "roof_tiles", { scope: "roof_only", modality: "partial" })]),
      variant("hvg.hu", "Az épületben keletkezett kárról beszél.", [observation("hvg.hu", "Az épületben kisebb viharkár keletkezett.", "kisebb viharkár keletkezett", "minor_damage", { scope: "building", modality: "partial" })]),
    ],
    entities: [{ id: "building", mention: "Fő téri könyvtár", type: "location", identity: "same" }],
    nonConflicts: [{ reason: "partial_scope_compatible", claims: ["roof_only", "building"] }],
  },
  {
    id: "V22-S10", slug: "uncertain-claim", category: "uncertain claim", title: "Bizonytalan ok a kikötőben",
    variants: [
      variant("telex.hu", "A szakértői feltételezést jelöli.", [observation("telex.hu", "A meghibásodást valószínűleg a túlmelegedés okozta.", "valószínűleg a túlmelegedés okozta", "overheating", { uncertainty: true, modality: "possible", attribution: { type: "expert", label: "szakértő" } })]),
      variant("index.hu", "A vizsgálat lezáratlanságát közli.", [observation("index.hu", "A hiba oka egyelőre ismeretlen.", "oka egyelőre ismeretlen", "unknown", { uncertainty: true, modality: "unknown" })]),
    ],
    entities: [{ id: "port", mention: "Folyóparti kikötő", type: "location", identity: "same" }],
    nonConflicts: [{ reason: "uncertainty_preserved", claims: ["possible", "unknown"] }],
  },
  {
    id: "V22-S11", slug: "anonymous-attribution", category: "anonymous attribution", title: "Névtelen forrás által jelzett költözés",
    variants: [
      variant("telex.hu", "A névtelen értesülést külön jelöli.", [observation("telex.hu", "Egy, az ügyet ismerő névtelen forrás szerint költözhet a hivatal.", "névtelen forrás szerint költözhet", "relocation", { attribution: { type: "anonymous", label: "névtelen forrás" }, modality: "reported", uncertainty: true })]),
      variant("24.hu", "A hivatal nem erősítette meg a hírt.", [observation("24.hu", "A hivatal nem kommentálta a költözésről szóló értesülést.", "nem kommentálta a költözésről szóló értesülést", "unconfirmed", { attribution: { type: "institution", label: "hivatal" }, modality: "unknown", uncertainty: true })]),
    ],
    entities: [{ id: "office", mention: "Városházi hivatal", type: "organization", identity: "same" }],
    nonConflicts: [{ reason: "attribution_and_confirmation_distinct", claims: ["anonymous_report", "unconfirmed"] }],
  },
  {
    id: "V22-S12", slug: "official-attribution", category: "official attribution", title: "A minisztérium és az önkormányzat állítása",
    variants: [
      variant("telex.hu", "A minisztériumi közlést idézi.", [observation("telex.hu", "A minisztérium szerint a program finanszírozása biztosított.", "A minisztérium szerint", "funding-secured", { attribution: { type: "official", label: "minisztérium" }, modality: "reported" })]),
      variant("hvg.hu", "Az önkormányzati tájékoztatást választja.", [observation("hvg.hu", "Az önkormányzat szerint a részletes szerződés még hiányzik.", "Az önkormányzat szerint", "contract-missing", { attribution: { type: "official", label: "önkormányzat" }, modality: "reported" })]),
    ],
    entities: [{ id: "program", mention: "Közlekedési program", type: "project", identity: "same" }],
    nonConflicts: [{ reason: "different_official_speakers", claims: ["ministry", "municipality"] }],
  },
  {
    id: "V22-S13", slug: "quote-vs-journalist", category: "quote vs journalist statement", title: "Idézet és újságírói megállapítás",
    variants: [
      variant("telex.hu", "A lakó idézett mondata áll a középpontban.", [observation("telex.hu", "„Nem újabb ígéretet kérünk” – mondta Szabó Anna.", "Nem újabb ígéretet kérünk", "no_more_promises", { attribution: { type: "quoted", label: "Szabó Anna" }, modality: "quoted" })]),
      variant("24.hu", "A cikk szerzője összegzi a hangulatot.", [observation("24.hu", "A lakók bizalma megingott a korábbi ígéretek miatt.", "A lakók bizalma megingott", "trust-declined", { attribution: { type: "journalist", label: "a cikk szerzője" }, modality: "journalist_statement" })]),
    ],
    entities: [{ id: "anna", mention: "Szabó Anna", type: "person", identity: "same" }],
    nonConflicts: [{ reason: "quote_not_journalist_fact", claims: ["quoted", "journalist_statement"] }],
  },
  {
    id: "V22-S14", slug: "entity-namesake", category: "entity namesake", title: "Két azonos nevű Nagy Péter",
    variants: [
      variant("telex.hu", "A pécsi kutatót mutatja be.", [observation("telex.hu", "Nagy Péter pécsi biológus írta alá a jelentést.", "Nagy Péter pécsi biológus", "researcher_pécs", { scope: "person-1" })]),
      variant("index.hu", "A szegedi képviselő megszólalását közli.", [observation("index.hu", "Nagy Péter szegedi képviselő cáfolta a hírt.", "Nagy Péter szegedi képviselő", "politician_szeged", { scope: "person-2" })]),
    ],
    entities: [{ id: "person-1", mention: "Nagy Péter", type: "person", identity: "distinct:pécs" }, { id: "person-2", mention: "Nagy Péter", type: "person", identity: "distinct:szeged" }],
    relations: [{ subject: "person-1", predicate: "works_for", object: "Pécsi Kutatóintézet", evidence: "pécsi biológus" }],
    nonConflicts: [{ reason: "namesake_context_keeps_identity_distinct", claims: ["person-1", "person-2"] }],
  },
  {
    id: "V22-S15", slug: "entity-type-ambiguity", category: "entity type ambiguity", title: "A Delta név többféle entitása",
    variants: [
      variant("telex.hu", "A Delta nevű cégről ír.", [observation("telex.hu", "A Delta Kft. új raktárt nyitott.", "Delta Kft. új raktárt", "company", { scope: "organization" })]),
      variant("24.hu", "A folyóparti Delta területet említi.", [observation("24.hu", "A Delta nevű partszakasz természetvédelmi terület.", "Delta nevű partszakasz", "place", { scope: "location" })]),
    ],
    entities: [{ id: "delta-company", mention: "Delta", type: "organization", identity: "unresolved" }, { id: "delta-place", mention: "Delta", type: "location", identity: "unresolved" }],
    nonConflicts: [{ reason: "type_ambiguity_requires_unresolved", claims: ["organization", "location"] }],
  },
  {
    id: "V22-S16", slug: "changed-plan-over-time", category: "changed plan over time", title: "Márciusról júniusra módosított kezdés",
    variants: [
      variant("telex.hu", "A korábbi tervet idézi.", [observation("telex.hu", "A munkálatok márciusban indulhatnak.", "márciusban indulhatnak", "2027-03", { modality: "plan", temporal: { start: "2027-03-01" } })]),
      variant("24.hu", "Az újabb ütemtervet közli.", [observation("24.hu", "A friss ütemterv szerint a kezdés júniusra tolódott.", "kezdés júniusra tolódott", "2027-06", { modality: "plan", temporal: { start: "2027-06-01" } })]),
      variant("hvg.hu", "A módosítás okát ismerteti.", [observation("hvg.hu", "A közbeszerzés miatt a júniusi kezdés maradt érvényben.", "júniusi kezdés maradt érvényben", "2027-06", { modality: "plan", temporal: { start: "2027-06-01" } })]),
    ],
    entities: [{ id: "works", mention: "Partfalépítés", type: "project", identity: "same" }],
    changesOverTime: [{ from: "2027-03", to: "2027-06", explanation: "A közölt tervezett kezdés márciusról júniusra változott." }],
  },
  {
    id: "V22-S17", slug: "source-omission", category: "source omission", title: "Közölt összeg és hiányzó coverage",
    variants: [
      variant("telex.hu", "A támogatási összeget közli.", [observation("telex.hu", "A pályázat 80 millió forintos kerettel indul.", "80 millió forintos kerettel", 80, { unit: "million HUF" })]),
      variant("24.hu", "Ugyanezt az összeget megerősíti.", [observation("24.hu", "A dokumentum 80 millió forintot különít el.", "80 millió forintot különít el", 80, { unit: "million HUF" })]),
      variant("index.hu", "A program társadalmi hatásáról ír.", []),
    ],
    entities: [{ id: "grant", mention: "Közösségi pályázat", type: "project", identity: "same" }],
    omissions: [{ source: "index.hu", predicate: "GRANT_AMOUNT" }],
  },
  {
    id: "V22-S18", slug: "common-and-source-specific", category: "common fact + source-specific detail", title: "Közös alap és egyedi részlet",
    variants: [
      variant("telex.hu", "A közös döntést és a műszaki részletet írja le.", [observation("telex.hu", "A város új buszokat vásárol, amelyek alacsonypadlósak.", "új buszokat vásárol", "bus-purchase", { scope: "shared" }), observation("telex.hu", "A járművekben kerékpártároló is lesz.", "kerékpártároló is lesz", "bike-rack", { scope: "source-only" })]),
      variant("24.hu", "A beszerzés tényét erősíti meg.", [observation("24.hu", "A város új buszokat vásárol.", "új buszokat vásárol", "bus-purchase", { scope: "shared" })]),
    ],
    entities: [{ id: "bus", mention: "Városi buszprogram", type: "project", identity: "same" }],
    omissions: [{ source: "24.hu", predicate: "BIKE_RACK" }],
  },
  {
    id: "V22-S19", slug: "corrected-information", category: "corrected information", title: "A forrás saját korrekciója",
    variants: [
      variant("telex.hu", "A korábbi közlés javítását is bemutatja.", [observation("telex.hu", "A korábbi közlésben 80 millió szerepelt.", "korábbi közlésben 80 millió", 80, { unit: "million HUF", temporal: { start: "2027-01-01" }, correctionOf: null }), observation("telex.hu", "A szerkesztőség pontosítása szerint a helyes összeg 90 millió forint.", "pontosítása szerint a helyes összeg 90 millió", 90, { unit: "million HUF", correctionOf: "telex.hu:80" })]),
      variant("24.hu", "A friss dokumentumot idézi.", [observation("24.hu", "A szerződés melléklete 90 millió forintos összeget tartalmaz.", "90 millió forintos összeget", 90, { unit: "million HUF" })]),
    ],
    entities: [{ id: "contract", mention: "Szerződés", type: "document", identity: "same" }],
    changesOverTime: [{ from: 80, to: 90, explanation: "A forrás a saját korábbi összegét pontosította; ez korrekció, nem két független forrás konfliktusa." }],
  },
  {
    id: "V22-S20", slug: "multi-event", category: "multi-event article", title: "Két külön esemény egy beszámolóban",
    variants: [
      variant("telex.hu", "A bejelentést és az átadást külön kezeli.", [observation("telex.hu", "A tanács hétfőn bejelentette a programot.", "hétfőn bejelentette", "announcement", { eventId: "event-1", temporal: { start: "2027-02-01" } }), observation("telex.hu", "A próbaüzem pénteken elindult.", "pénteken elindult", "pilot-start", { eventId: "event-2", temporal: { start: "2027-02-05" } })]),
      variant("index.hu", "A próbaüzem eredményét közli.", [observation("index.hu", "A próbaüzem első napján három mérőpont működött.", "első napján három mérőpont működött", "pilot-result", { eventId: "event-2", temporal: { start: "2027-02-05" } })]),
      variant("hvg.hu", "A tanácsi döntés hátterét adja.", [observation("hvg.hu", "A tanács külön határozatban rögzítette a program célját.", "külön határozatban rögzítette", "announcement", { eventId: "event-1", temporal: { start: "2027-02-01" } })]),
    ],
    entities: [{ id: "council", mention: "Városi tanács", type: "organization", identity: "same" }, { id: "pilot", mention: "Próbaüzem", type: "event", identity: "same" }],
    relations: [{ subject: "Városi tanács", predicate: "announced", object: "event-1", evidence: "tanács hétfőn bejelentette" }],
    events: [{ id: "event-1", title: "Programbejelentés", membership: ["telex.hu", "hvg.hu"] }, { id: "event-2", title: "Próbaüzem indulása", membership: ["telex.hu", "index.hu"] }],
    nonConflicts: [{ reason: "separate_event_membership", claims: ["event-1", "event-2"] }],
  },
];

function words(text) { return String(text).trim().split(/\s+/u).filter(Boolean).length; }

function buildSourceText(blueprint, sourceVariant, index) {
  const facts = sourceVariant.observations.length
    ? sourceVariant.observations.map((item) => item.sentence)
    : ["A forrás a kapcsolódó döntésről és a helyszíni tapasztalatokról számol be, de ehhez a részlethez nem közöl számszerű adatot."];
  const paragraphs = [
    `${blueprint.title}. ${sourceVariant.angle}`,
    ...facts,
    "A beszámoló szerint a történet több szereplő és több időpont egymásra hatásából áll össze.",
    "A helyszíni munkatársak a közlemények mellett dokumentumokat és megszólalásokat is áttekintettek.",
  ];
  let cursor = 0;
  while (words(paragraphs.join(" ")) < 520) {
    paragraphs.push(FILLER[(cursor + index) % FILLER.length]);
    cursor += 1;
  }
  return paragraphs.join("\n\n");
}

function buildScenario(blueprint) {
  const variants = blueprint.variants.map((sourceVariant, index) => ({
    source: { key: sourceVariant.source.key, label: sourceVariant.source.label },
    title: `${blueprint.title} – ${sourceVariant.source.label}`,
    url: `https://${sourceVariant.source.key}/v22/${blueprint.slug}/${index + 1}`,
    text: buildSourceText(blueprint, sourceVariant, index),
    wordCount: words(buildSourceText(blueprint, sourceVariant, index)),
    observations: sourceVariant.observations.map((item, observationIndex) => ({ id: `${blueprint.id}:claim:${index + 1}:${observationIndex + 1}`, predicate: predicateFor(blueprint, sourceVariant, item), ...item })),
  }));
  const claims = variants.flatMap((item) => item.observations.map((claim) => ({ ...claim, source: item.source.key })));
  return {
    id: blueprint.id,
    slug: blueprint.slug,
    category: blueprint.category,
    title: blueprint.title,
    sourceVariants: variants,
    expected: {
      entities: blueprint.entities || [],
      entityIdentityExpectations: (blueprint.entities || []).map((entity) => ({ id: entity.id, expectation: entity.identity })),
      relations: blueprint.relations || [],
      claims,
      events: blueprint.events || [],
      conflicts: blueprint.conflicts || [],
      nonConflicts: blueprint.nonConflicts || [],
      omissions: blueprint.omissions || [],
      changesOverTime: blueprint.changesOverTime || [],
    },
  };
}

function buildBenchmarkDataset() {
  return {
    benchmarkVersion: "v22.benchmark.1",
    contractVersion: "v22.intelligence-quality-benchmark.1",
    generatedBy: "lib/v22/benchmark-dataset.cjs",
    sourcePolicy: "all text is original controlled Hungarian benchmark material; no full real article is copied",
    scenarios: BLUEPRINTS.map(buildScenario),
  };
}

module.exports = { SOURCES, BLUEPRINTS, buildBenchmarkDataset, buildSourceText, words };
