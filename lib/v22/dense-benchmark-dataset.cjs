"use strict";

const { words } = require("./benchmark-dataset.cjs");

const FILLER = [
  "A háttéranyag az érintettek eltérő szempontjait, a dokumentumok sorrendjét és a következő döntési pontokat is bemutatja.",
  "A közölt tényeket a szerkesztőség elválasztja a tervektől, feltételezésektől és a megszólalók saját értelmezésétől.",
  "A helyi iratok és az interjúk eltérő hangsúlyai miatt minden állítás forrásjelölést és időbeli környezetet kap.",
  "A projekt több részfeladata lezárult, más feladatok feltételesek vagy még ellenőrzésre várnak.",
  "A következő mérföldkő az engedélyek, a költségvetés és a résztvevő intézmények döntéseitől függ.",
];

function obs(source, predicate, sentence, evidence, value, options = {}) {
  return { source, predicate, sentence, evidence, value, unit: options.unit ?? null, attribution: options.attribution ?? null,
    modality: options.modality ?? "asserted", polarity: options.polarity ?? "affirmed", uncertainty: options.uncertainty === true,
    conditional: options.conditional === true, temporal: options.temporal ?? null, scope: options.scope ?? null, eventId: options.eventId ?? null };
}

const SPECS = [
  { id: "V22-D01", slug: "river-renewal", title: "Folyóparti megújítás több ütemben", entities: ["Kékfolyó-part program", "Dunamenti önkormányzat", "Kiss Júlia", "partfal-átadás"], relation: ["Dunamenti önkormányzat", "announced", "partfal-átadás"], change: { from: "2027-04", to: "2027-07" }, omission: "BUDGET_RESERVE", base: [
    ["PROJECT_COST", "A program első ütemének költsége 240 millió forint.", "első ütemének költsége 240 millió forint", 240, "million HUF"],
    ["CONSTRUCTION_START", "A munkák áprilisban indulhatnak, ha elkészül az engedély.", "áprilisban indulhatnak, ha elkészül az engedély", "2027-04", null, { modality: "conditional", conditional: true }],
    ["COMPLETION_PERCENT", "A projekt készültsége jelenleg 35 százalék.", "készültsége jelenleg 35 százalék", 35, "%"],
    ["ENGINEER_ASSESSMENT", "Kiss Júlia mérnök szerint a partfal állapota megfelelő.", "Kiss Júlia mérnök szerint", "stable", null, { attribution: { type: "expert", label: "Kiss Júlia" }, modality: "reported" }],
    ["DISTANCE", "A dokumentum 1,2 kilométeres szakaszt jelöl ki.", "1,2 kilométeres szakaszt", 1.2, "km"],
    ["OPENING_EVENT", "A tanács hétfőn bejelentette az átadási ütemet.", "tanács hétfőn bejelentette", "announcement", null, { eventId: "dense-event" }],
    ["BUDGET_RESERVE", "A tartalékkeret összege még nem ismert.", "tartalékkeret összege még nem ismert", "unknown", null, { modality: "unknown", uncertainty: true }],
    ["PROJECT_START", "A korábbi tervben áprilisi kezdés szerepelt.", "korábbi tervben áprilisi kezdés szerepelt", "2027-04", null, { modality: "plan" }],
  ] },
  { id: "V22-D02", slug: "hospital-network", title: "Kórházi hálózat és eltérő várólisták", entities: ["Északi kórházi hálózat", "Szent László Kórház", "Varga András", "ambulancia-indítás"], relation: ["Északi kórházi hálózat", "announced", "ambulancia-indítás"], change: { from: 14, to: 9 }, omission: "WAITING_DAYS", base: [
    ["WAITING_DAYS", "A hálózat 14 napos várólistát közölt.", "14 napos várólistát közölt", 14, "day", { attribution: { type: "official", label: "kórházi hálózat" } }],
    ["SERVICE_START", "A mobil ambulancia májusban indulhat, ha lesz személyzet.", "májusban indulhat, ha lesz személyzet", "2027-05", null, { modality: "conditional", conditional: true }],
    ["CAPACITY_PERCENT", "A kapacitás bővítése 18 százalékos.", "kapacitás bővítése 18 százalékos", 18, "%"],
    ["DOCTOR_ASSESSMENT", "Varga András szerint a rendszer átmenetileg terhelhető.", "Varga András szerint", "temporarily-capable", null, { attribution: { type: "expert", label: "Varga András" }, modality: "reported" }],
    ["VEHICLE_COUNT", "A program 3 új járművet használ.", "3 új járművet használ", 3, "vehicle"],
    ["OPENING_EVENT", "A hálózat hétfőn bejelentette az indulást.", "hálózat hétfőn bejelentette", "announcement", null, { eventId: "dense-event" }],
    ["WAITING_DAYS", "A korábbi lista 14 napos volt.", "korábbi lista 14 napos volt", 14, "day", { modality: "plan" }],
    ["WAITING_GROWTH", "A sürgősségi eseteknél nem nőtt a várakozás.", "nem nőtt a várakozás", false, null, { polarity: "negated" }],
  ] },
  { id: "V22-D03", slug: "school-digital", title: "Iskolai digitalizáció és feltételes beszerzés", entities: ["Digitális Tanterem program", "Béke téri iskola", "Németh Éva", "eszközátadás"], relation: ["Digitális Tanterem program", "announced", "eszközátadás"], change: { from: "2027-03", to: "2027-09" }, omission: "DEVICE_COUNT", base: [
    ["PROJECT_COST", "A program kerete 90 millió forint.", "program kerete 90 millió forint", 90, "million HUF"],
    ["DELIVERY_DATE", "Az eszközátadás szeptemberben indulhat, ha a szállító teljesít.", "eszközátadás szeptemberben indulhat, ha a szállító teljesít", "2027-09", null, { modality: "conditional", conditional: true }],
    ["NETWORK_PERCENT", "Az iskolák 55 százalékában van megfelelő hálózat.", "iskolák 55 százalékában van megfelelő hálózat", 55, "%"],
    ["TEACHER_ASSESSMENT", "Németh Éva szerint a tanárok képzése elengedhetetlen.", "Németh Éva szerint", "training-needed", null, { attribution: { type: "expert", label: "Németh Éva" }, modality: "reported" }],
    ["DEVICE_COUNT", "A keretből 600 tabletet vásárolnak.", "600 tabletet vásárolnak", 600, "device"],
    ["OPENING_EVENT", "A program hétfőn bejelentette az átadási rendet.", "program hétfőn bejelentette", "announcement", null, { eventId: "dense-event" }],
    ["DELIVERY_DATE", "A korábbi tervben márciusi átadás szerepelt.", "korábbi tervben márciusi átadás szerepelt", "2027-03", null, { modality: "plan" }],
    ["TRAINING_DATE", "A képzés időpontja még nem végleges.", "képzés időpontja még nem végleges", "unknown", null, { modality: "unknown", uncertainty: true }],
  ] },
  { id: "V22-D04", slug: "energy-storage", title: "Energiatároló beruházás és vitatott teljesítmény", entities: ["Napfény energiatároló", "Alföldi Energia Zrt.", "Tóth Márton", "hálózati próba"], relation: ["Alföldi Energia Zrt.", "announced", "hálózati próba"], change: { from: 40, to: 55 }, omission: "GRID_LOSS", base: [
    ["CAPACITY", "A tároló teljesítménye 40 megawattóra.", "teljesítménye 40 megawattóra", 40, "MWh", { attribution: { type: "official", label: "beruházó" } }],
    ["TRIAL_DATE", "A hálózati próba októberben indulhat, ha elkészül a csatlakozás.", "hálózati próba októberben indulhat, ha elkészül a csatlakozás", "2027-10", null, { modality: "conditional", conditional: true }],
    ["PROJECT_COST", "A fejlesztés költsége 1,8 milliárd forint.", "fejlesztés költsége 1,8 milliárd forint", 1.8, "billion HUF"],
    ["ENGINEER_ASSESSMENT", "Tóth Márton szerint a hálózat stabil marad.", "Tóth Márton szerint", "stable", null, { attribution: { type: "expert", label: "Tóth Márton" }, modality: "reported" }],
    ["CONTAINER_COUNT", "A telep 24 konténert fogad be.", "telep 24 konténert fogad be", 24, "container"],
    ["OPENING_EVENT", "Az energia cég bejelentette a hálózati próbát.", "energia cég bejelentette", "announcement", null, { eventId: "dense-event" }],
    ["CAPACITY", "A régi terv 40 MWh kapacitással számolt.", "régi terv 40 MWh kapacitással számolt", 40, "MWh", { modality: "plan" }],
    ["GRID_LOSS", "A veszteség pontos értéke még ismeretlen.", "veszteség pontos értéke még ismeretlen", "unknown", null, { modality: "unknown", uncertainty: true }],
  ] },
  { id: "V22-D05", slug: "rail-bridge", title: "Vasúti híd javítása és külön események", entities: ["Keleti vasúti híd", "Délvidéki Vasút", "Farkas László", "terhelési próba"], relation: ["Délvidéki Vasút", "announced", "terhelési próba"], change: { from: "2027-05-10", to: "2027-08-20" }, omission: "SPEED_LIMIT", base: [
    ["COMPLETION_PERCENT", "A híd javítása 70 százaléknál tart.", "javítása 70 százaléknál tart", 70, "%"],
    ["TRIAL_DATE", "A terhelési próba augusztusban indulhat, ha a síncsere lezárul.", "terhelési próba augusztusban indulhat, ha a síncsere lezárul", "2027-08", null, { modality: "conditional", conditional: true }],
    ["PROJECT_COST", "A javítás 3,4 milliárd forintba kerül.", "javítás 3,4 milliárd forintba kerül", 3.4, "billion HUF", { attribution: { type: "official", label: "vasúttársaság" } }],
    ["ENGINEER_ASSESSMENT", "Farkas László szerint a szerkezet biztonságos.", "Farkas László szerint", "safe", null, { attribution: { type: "expert", label: "Farkas László" }, modality: "reported" }],
    ["DISTANCE", "A pálya 2,3 kilométeren újul meg.", "pálya 2,3 kilométeren újul meg", 2.3, "km"],
    ["OPENING_EVENT", "A vasúttársaság bejelentette a terhelési próbát.", "vasúttársaság bejelentette", "announcement", null, { eventId: "dense-event" }],
    ["PROJECT_START", "A májusi mérföldkő teljesítése késik.", "májusi mérföldkő teljesítése késik", "delay", null, { modality: "asserted" }],
    ["SPEED_LIMIT", "A sebességkorlátozás részleteit nem közölték.", "sebességkorlátozás részleteit nem közölték", "unknown", null, { modality: "unknown", uncertainty: true }],
  ] },
];

function buildDenseScenario(spec) {
  const sourceKeys = ["telex.hu", "24.hu", "hvg.hu"];
  const variants = sourceKeys.map((source, sourceIndex) => {
    let observations = spec.base.map((item, itemIndex) => {
      const [predicate, sentence, evidence, value, unit, options = {}] = item;
      const adjusted = sourceIndex === 1 && itemIndex === 0 && typeof value === "number" ? value + 5 : value;
      return obs(source, predicate, sentence, evidence, adjusted, { ...options, unit });
    });
    if (sourceIndex === 2) {
      observations = observations.filter((item) => item.predicate !== spec.omission);
      observations.push(obs(source, "SOURCE_CONTEXT", "A beszámoló a program közösségi hatásait is összegzi.", "program közösségi hatásait is összegzi", "community-impact", { modality: "reported" }));
      while (observations.length < 8) observations.push(obs(source, "SOURCE_CONTEXT", "A szervezők a következő egyeztetés eredményét később közlik.", "következő egyeztetés eredményét később közlik", "pending", { modality: "plan" }));
    }
    const paragraphs = [`${spec.title}. A ${source} szerkesztőségi háttéranyaga a folyamat teljes ívét követi.`, ...observations.map((item) => item.sentence), ...FILLER];
    let cursor = 0;
    while (words(paragraphs.join(" ")) < 720) { paragraphs.push(FILLER[cursor % FILLER.length]); cursor += 1; }
    const text = paragraphs.join("\n\n");
    return { source: { key: source, label: source }, title: `${spec.title} – ${source}`, url: `https://${source}/v22/dense/${spec.slug}/${sourceIndex + 1}`, text, wordCount: words(text), observations };
  });
  const claims = variants.flatMap((variant) => variant.observations.map((item, index) => ({ ...item, id: `${spec.id}:claim:${variant.source.key}:${index + 1}` })));
  return { id: spec.id, slug: spec.slug, category: spec.category || spec.slug, title: spec.title, sourceVariants: variants, expected: {
    entities: spec.entities.map((mention, index) => ({ id: `${spec.id}:entity:${index + 1}`, mention, normalized: mention.toLowerCase(), type: index === 1 ? "organization" : index === 2 ? "person" : index === 3 ? "event" : "project", identity: "same" })),
    relations: [{ subject: spec.relation[0], predicate: spec.relation[1], object: spec.relation[2], evidence: "bejelentette" }],
    claims, events: [{ id: `${spec.id}:event`, title: spec.entities[3], membership: sourceKeys }], conflicts: [], nonConflicts: [], omissions: [{ source: spec.omission === "SPEED_LIMIT" ? "hvg.hu" : "hvg.hu", predicate: spec.omission }], changesOverTime: [spec.change],
  } };
}

function buildDenseBenchmarkDataset() { return { benchmarkVersion: "v22.benchmark.1", contractVersion: "v22.2.dense-benchmark.1", scenarios: SPECS.map(buildDenseScenario) }; }

module.exports = { SPECS, buildDenseBenchmarkDataset };
