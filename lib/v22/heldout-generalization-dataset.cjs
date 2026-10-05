"use strict";

// Held-out material is deliberately independent from the core/dense fixtures:
// different names, organisations, subjects and sentence shapes. The provider
// must see only sourceVariants; expected is evaluation-only metadata.
function article(source, title, text) {
  return { source: { key: source, label: source }, title, url: `https://${source}/heldout/${encodeURIComponent(title)}`, text, wordCount: text.split(/\s+/u).filter(Boolean).length };
}
function entity(id, mention, type, evidence, importance = "critical") {
  return { id, mention, normalized: mention.toLocaleLowerCase("hu"), type, identity: "same", evidence, importance };
}
function claim(source, predicate, value, unit, evidence, sentence, options = {}) {
  return { source, predicate, value, unit, evidence, sentence, modality: options.modality || "asserted", polarity: options.polarity || "affirmed", attribution: options.attribution || null, importance: options.importance || "critical" };
}
function scenario(id, title, variants, expected) {
  return { id, slug: id.toLowerCase(), category: id, title, sourceVariants: variants, expected: { entities: expected.entities, relations: expected.relations || [], claims: expected.claims || [], events: expected.events || [], conflicts: expected.conflicts || [], nonConflicts: expected.nonConflicts || [], omissions: expected.omissions || [], changesOverTime: expected.changesOverTime || [] } };
}

const scenarios = [
  scenario("H01", "Új peron készül a folyóparti pályaudvaron", [
    article("napihir.hu", "Új peron készül a folyóparti pályaudvaron", "A Nyugati peronprogram a szolnoki folyóparti pályaudvar átalakítását célozza. A Városi Közlekedési Hivatal négyszázhúsz millió forintot különített el. Barta Réka, a hivatal műszaki vezetője úgy fogalmazott, hogy a kivitelezés 2028 márciusára készülhet el. A berendezés 62 százaléka már a helyén van. A beruházás lezárásának eseménye a próbaszolgálat indulása lesz."),
    article("reggeliujsag.hu", "Pályaudvari fejlesztés új menetrenddel", "A szolnoki állomásnál futó Nyugati peronprogram költségvetése 420 millió forint. A Városi Közlekedési Hivatal közlése szerint a munkát 2028 áprilisában fejeznék be, amennyiben a beszállító időben érkezik. Barta Réka szerint a műszaki átadás rendben halad. A peron elkészültsége 62 százalék.")
  ], {
    entities: [entity("H01:E1", "Nyugati peronprogram", "project", "Nyugati peronprogram"), entity("H01:E2", "Városi Közlekedési Hivatal", "organization", "Városi Közlekedési Hivatal"), entity("H01:E3", "Barta Réka", "person", "Barta Réka"), entity("H01:E4", "Szolnok", "location", "szolnoki")],
    relations: [{ subject: "Városi Közlekedési Hivatal", predicate: "announced", object: "próbaszolgálat indulása", evidence: "különített el" }],
    claims: [claim("napihir.hu", "PROJECT_COST", 420, "million HUF", "négyszázhúsz millió forintot különített el", "A Városi Közlekedési Hivatal négyszázhúsz millió forintot különített el."), claim("reggeliujsag.hu", "PROJECT_COST", 420, "million HUF", "költségvetése 420 millió forint", "A Városi Közlekedési Hivatal közlése szerint a Nyugati peronprogram költségvetése 420 millió forint."), claim("napihir.hu", "COMPLETION_PERCENT", 62, "%", "62 százaléka már a helyén van", "A berendezés 62 százaléka már a helyén van."), claim("reggeliujsag.hu", "COMPLETION_PERCENT", 62, "%", "elkészültsége 62 százalék", "A peron elkészültsége 62 százalék."), claim("napihir.hu", "PROJECT_START", "2028-03", "date", "2028 márciusára készülhet el", "a kivitelezés 2028 márciusára készülhet el", { modality: "possible" })],
    events: [{ title: "próbaszolgálat indulása", membership: ["napihir.hu"] }],
  }),
  scenario("H02", "Kézműves üzemet vesz a Vektor", [
    article("uzletfigyelo.hu", "Kézműves üzemet vesz a Vektor", "A Vektor Holding megszerezte a Tiszavirág Élelmiszerüzemet. A tranzakció értéke 2,4 milliárd forint. Kelemen Áron, a Vektor vezérigazgatója idézetben azt mondta: a gyártósorokat korszerűsítik. A cég 18 százalékos kapacitásnövelést tervez."),
    article("piacma.hu", "Tulajdonosváltás a Tiszavirágban", "A Tiszavirág Élelmiszerüzem új tulajdonosa a Vektor Holding lett. A vállalat tájékoztatása szerint a vételár 2,4 milliárd forint, a bővítés pedig jövő nyáron indulhat. Kelemen Áron közölte, hogy az első próbagyártást már megtartották.")
  ], {
    entities: [entity("H02:E1", "Vektor Holding", "organization", "Vektor Holding"), entity("H02:E2", "Tiszavirág Élelmiszerüzem", "organization", "Tiszavirág Élelmiszerüzemet"), entity("H02:E3", "Kelemen Áron", "person", "Kelemen Áron")],
    relations: [{ subject: "Kelemen Áron", predicate: "CEO_OF", object: "Vektor Holding", evidence: "Vektor vezérigazgatója" }],
    claims: [claim("uzletfigyelo.hu", "PROJECT_COST", 2.4, "billion HUF", "tranzakció értéke 2,4 milliárd forint", "A tranzakció értéke 2,4 milliárd forint."), claim("uzletfigyelo.hu", "CAPACITY_PERCENT", 18, "%", "18 százalékos kapacitásnövelést tervez", "A cég 18 százalékos kapacitásnövelést tervez.", { modality: "plan" }), claim("piacma.hu", "PROJECT_COST", 2.4, "billion HUF", "vételár 2,4 milliárd forint", "a vételár 2,4 milliárd forint")],
    events: [{ title: "első próbagyártás", membership: ["piacma.hu"] }],
  }),
  scenario("H03", "Új szárnyat kap a hegyvidéki klinika", [
    article("egeszsegter.hu", "Új szárnyat kap a hegyvidéki klinika", "A Hegyvidéki Klinikai Központ naponta további 36 beteget tudna fogadni az új szárnyban. A fejlesztés 2028 őszén indulhat, ha a közbeszerzés lezárul. Dr. Fodor Emese szerint a várólista nem nőtt. A helyszín a Miskolc melletti Diósgyőr."),
    article("korhazfigyelo.hu", "Bővül a diósgyőri ellátás", "A Diósgyőrben működő Hegyvidéki Klinikai Központ 36 férőhellyel bővülhet. A főorvos, Dr. Fodor Emese úgy nyilatkozott, hogy sérülés nem történt az előkészítés alatt. A projekt várható átadása 2028 november.")
  ], {
    entities: [entity("H03:E1", "Hegyvidéki Klinikai Központ", "organization", "Hegyvidéki Klinikai Központ"), entity("H03:E2", "Dr. Fodor Emese", "person", "Dr. Fodor Emese"), entity("H03:E3", "Diósgyőr", "location", "Diósgyőr")],
    claims: [claim("egeszsegter.hu", "SERVICE_START", "2028-09", "date", "2028 őszén indulhat", "A fejlesztés 2028 őszén indulhat, ha a közbeszerzés lezárul.", { modality: "conditional" }), claim("egeszsegter.hu", "WAITING_GROWTH", false, null, "várólista nem nőtt", "Dr. Fodor Emese szerint a várólista nem nőtt.", { polarity: "negated" }), claim("korhazfigyelo.hu", "INJURY_OCCURRED", false, null, "sérülés nem történt", "sérülés nem történt az előkészítés alatt", { polarity: "negated" })],
  }),
  scenario("H04", "Digitális napló az alföldi iskolákban", [
    article("oktatashir.hu", "Digitális napló az alföldi iskolákban", "A Berek téri iskola szeptembertől digitális naplót vezetne. A fenntartó 73 százalékos eszközellátottságról számolt be. Molnár Ildikó igazgató szerint a tanári képzés két hétig tart majd. Az első próbanap 2027 októberében lehet."),
    article("tanugyma.hu", "Eszközcsomag érkezik a Berek térre", "A Berek téri iskola 300 táblagépet kapott, az oktatási hivatal pedig 2027 október 12-re tette a próbanapot. Molnár Ildikó bejelentette a digitális napló indulását. A korábbi elképzelésben még szeptemberi kezdés szerepelt.")
  ], {
    entities: [entity("H04:E1", "Berek téri iskola", "organization", "Berek téri iskola"), entity("H04:E2", "Molnár Ildikó", "person", "Molnár Ildikó"), entity("H04:E3", "Alföld", "location", "alföldi")],
    claims: [claim("oktatashir.hu", "NETWORK_PERCENT", 73, "%", "73 százalékos eszközellátottságról", "A fenntartó 73 százalékos eszközellátottságról számolt be."), claim("oktatashir.hu", "TRAINING_DATE", "2027-10", "date", "2027 októberében lehet", "Az első próbanap 2027 októberében lehet.", { modality: "possible" }), claim("tanugyma.hu", "DEVICE_COUNT", 300, "device", "300 táblagépet kapott", "A Berek téri iskola 300 táblagépet kapott."), claim("tanugyma.hu", "DELIVERY_DATE", "2027-10-12", "date", "2027 október 12-re tette", "az oktatási hivatal pedig 2027 október 12-re tette a próbanapot")],
    changesOverTime: [{ from: "2027-09", to: "2027-10" }],
  }),
  scenario("H05", "Két külön döntés a tóparti fesztiválon", [
    article("sportarena.hu", "Két külön döntés a tóparti fesztiválon", "A Balaton-parti Atlétikai Szövetség július 4-én engedélyezte a tófutás rajtját. Ugyanezen a napon a szervezők lemondták az esti gálameccset. Az esemény első neve: Tófutás rajtja. A második program megnevezése: Gálameccs törlése. Papp Zoltán szóvivő szerint a közönség biztonsága az első."),
    article("stadionlap.hu", "Tófutás lesz, gálameccs nem", "Papp Zoltán közölte, hogy a Tófutás rajtja szombaton elindul. A Gálameccs törlése külön szervezési döntés volt. A Balaton-parti Atlétikai Szövetség 12 ezer nézővel számol.")
  ], {
    entities: [entity("H05:E1", "Balaton-parti Atlétikai Szövetség", "organization", "Balaton-parti Atlétikai Szövetség"), entity("H05:E2", "Papp Zoltán", "person", "Papp Zoltán"), entity("H05:E3", "Tófutás rajtja", "event", "Tófutás rajtja"), entity("H05:E4", "Gálameccs törlése", "event", "Gálameccs törlése"), entity("H05:E5", "Balaton", "location", "Balaton-parti")],
    events: [{ title: "Tófutás rajtja", membership: ["sportarena.hu"] }, { title: "Gálameccs törlése", membership: ["sportarena.hu"] }],
    claims: [claim("stadionlap.hu", "AUDIENCE_COUNT", 12000, "person", "12 ezer nézővel", "A Balaton-parti Atlétikai Szövetség 12 ezer nézővel számol.")],
  }),
  scenario("H06", "Azonos családnév, két eltérő szakértő", [
    article("birosagfigyelo.hu", "Azonos családnév, két eltérő szakértő", "A Szegedi Törvényszék ítélete szerint a Nádasdy-parti telek visszakerülhet az önkormányzathoz. A tárgyaláson Varga Anna ügyvéd a döntést jogszerűnek nevezte. Egy másik ügyben Varga Bence közgazdász vitatta a kártalanítás összegét. A határozat 2028 januárjában emelkedhet jogerőre."),
    article("jogaszvilag.hu", "Külön ügyekben szólalt meg a két Varga", "Varga Anna azt mondta, hogy a Nádasdy-parti telek ügye lezárult. Varga Bence szerint a kártalanítás 84 millió forint. A Szegedi Törvényszék közleménye ezt az összeget nem erősítette meg.")
  ], {
    entities: [entity("H06:E1", "Szegedi Törvényszék", "organization", "Szegedi Törvényszék"), entity("H06:E2", "Varga Anna", "person", "Varga Anna"), entity("H06:E3", "Varga Bence", "person", "Varga Bence"), entity("H06:E4", "Nádasdy-parti telek", "location", "Nádasdy-parti telek")],
    claims: [claim("birosagfigyelo.hu", "PROJECT_START", "2028-01", "date", "2028 januárjában emelkedhet jogerőre", "A határozat 2028 januárjában emelkedhet jogerőre.", { modality: "possible" }), claim("jogaszvilag.hu", "PROJECT_COST", 84, "million HUF", "kártalanítás 84 millió forint", "Varga Bence szerint a kártalanítás 84 millió forint.")],
  }),
  scenario("H07", "Eltérő számok az esti áramszünetről", [
    article("alfahir.hu", "Eltérő számok az esti áramszünetről", "A Zöldmező Villamosművek közlése szerint a javítás költsége 120 millió forint. A Petőfi lakótelepen 2400 fogyasztási hely maradt áram nélkül. A helyreállítás eseménye 21 órakor kezdődött."),
    article("estikronika.hu", "Nagyobb számlát említ a szolgáltató", "A Zöldmező Villamosművek 150 millió forintos helyreállítási költséget közölt. A szolgáltató szerint a kiesés 2400 fogyasztási helyet érintett."),
    article("varoslap.hu", "Az áramszünet okát vizsgálják", "A Petőfi lakótelep esti kimaradásának okát a hatóság vizsgálja. A közlemény a javítás végösszegét nem ismertette.")
  ], {
    entities: [entity("H07:E1", "Zöldmező Villamosművek", "organization", "Zöldmező Villamosművek"), entity("H07:E2", "Petőfi lakótelep", "location", "Petőfi lakótelepen")],
    claims: [claim("alfahir.hu", "PROJECT_COST", 120, "million HUF", "javítás költsége 120 millió forint", "a javítás költsége 120 millió forint"), claim("estikronika.hu", "PROJECT_COST", 150, "million HUF", "150 millió forintos helyreállítási költséget", "150 millió forintos helyreállítási költséget közölt"), claim("alfahir.hu", "AFFECTED_COUNT", 2400, "site", "2400 fogyasztási hely", "2400 fogyasztási hely maradt áram nélkül"), claim("estikronika.hu", "AFFECTED_COUNT", 2400, "site", "2400 fogyasztási helyet érintett", "2400 fogyasztási helyet érintett"), claim("varoslap.hu", "PROJECT_COST", "unknown", null, "végösszegét nem ismertette", "A közlemény a javítás végösszegét nem ismertette.", { modality: "unknown" })],
    conflicts: [{ type: "numeric", claims: ["alfahir.hu", "estikronika.hu"] }],
    omissions: [{ source: "varoslap.hu", predicate: "PROJECT_COST" }],
  }),
  scenario("H08", "Régi ár és új gyártósor", [
    article("iparhang.hu", "Régi ár és új gyártósor", "A 2022-es iratban a beruházás 80 millió forintos költsége szerepel. Az új, 2026-os terv már 120 millió forinttal számol. A Rába Alkatrészgyár a kapacitást 15 százalékkal emelné. Sipos Levente mérnök szerint a régi számot nem szabad az új tervvel összekeverni."),
    article("gyarvilag.hu", "Frissített költségvetés a Rábánál", "A Rába Alkatrészgyár 2026-os programja 120 millió forintba kerülhet. A 2022-ben feljegyzett 80 millió csak történelmi adat. Sipos Levente szerint a próbagyártás 2027 májusában indulhat.")
  ], {
    entities: [entity("H08:E1", "Rába Alkatrészgyár", "organization", "Rába Alkatrészgyár"), entity("H08:E2", "Sipos Levente", "person", "Sipos Levente")],
    claims: [claim("iparhang.hu", "PROJECT_COST", 80, "million HUF", "80 millió forintos költsége", "A 2022-es iratban a beruházás 80 millió forintos költsége szerepel."), claim("iparhang.hu", "PROJECT_COST", 120, "million HUF", "2026-os terv már 120 millió forinttal számol", "Az új, 2026-os terv már 120 millió forinttal számol."), claim("iparhang.hu", "CAPACITY_PERCENT", 15, "%", "kapacitást 15 százalékkal emelné", "A Rába Alkatrészgyár a kapacitást 15 százalékkal emelné.", { modality: "plan" }), claim("gyarvilag.hu", "PROJECT_COST", 120, "million HUF", "2026-os programja 120 millió forintba kerülhet", "A Rába Alkatrészgyár 2026-os programja 120 millió forintba kerülhet.", { modality: "possible" }), claim("gyarvilag.hu", "SERVICE_START", "2027-05", "date", "próbagyártás 2027 májusában indulhat", "a próbagyártás 2027 májusában indulhat", { modality: "possible" })],
    nonConflicts: [{ reason: "historical-versus-current", claims: [80, 120] }],
  }),
  scenario("H09", "Új szabály a belvárosi rakodásról", [
    article("onkormanyzatma.hu", "Új szabály a belvárosi rakodásról", "A Fővárosi Tanács rendelete szerint a Kőris utca üzletei reggel hat és nyolc között rakodhatnak. A rendelet 2028 februárjában léphet életbe. A döntés eseménye a közgyűlési kihirdetés volt."),
    article("varosihirek.hu", "Korlátozott időablak a Kőris utcában", "A Kőris utcai kereskedők közölték, hogy az új rakodási időablak kétórás lesz. A Fővárosi Tanács a kihirdetés után egyeztetést ígért."),
    article("helyikozlet.hu", "A rendelet részletei még hiányoznak", "A Fővárosi Tanács napirendjén szerepel a Kőris utcai rakodás, de a pontos életbelépési dátumot nem közölték.")
  ], {
    entities: [entity("H09:E1", "Fővárosi Tanács", "organization", "Fővárosi Tanács"), entity("H09:E2", "Kőris utca", "location", "Kőris utca")],
    claims: [claim("onkormanyzatma.hu", "DEADLINE", "2028-02", "date", "2028 februárjában léphet életbe", "A rendelet 2028 februárjában léphet életbe.", { modality: "possible" }), claim("varosihirek.hu", "TIME_WINDOW", 2, "hour", "kétórás lesz", "az új rakodási időablak kétórás lesz")],
    events: [{ title: "közgyűlési kihirdetés", membership: ["onkormanyzatma.hu"] }],
    omissions: [{ source: "helyikozlet.hu", predicate: "DEADLINE" }],
  }),
  scenario("H10", "Jégeső rongálta meg a déli ültetvényeket", [
    article("idojarasfigyelo.hu", "Jégeső rongálta meg a déli ültetvényeket", "A Délvidéki Gazdakör jelentése szerint a Hársas dűlőben a tetőcserepek harmada sérült meg a jégesőben. A kárfelmérés 38 millió forintos veszteséget becsül. Tóth Noémi falugazdász szerint újabb zivatar nem várható ma este."),
    article("gazdaregio.hu", "Kárfelmérés a Hársas dűlőben", "A Hársas dűlő gyümölcsöseiben 38 millió forintnyi kárt jeleztek. Tóth Noémi közölte, hogy a biztosítók pénteken kezdik a szemlét.")
  ], {
    entities: [entity("H10:E1", "Délvidéki Gazdakör", "organization", "Délvidéki Gazdakör"), entity("H10:E2", "Hársas dűlő", "location", "Hársas dűlő"), entity("H10:E3", "Tóth Noémi", "person", "Tóth Noémi")],
    claims: [claim("idojarasfigyelo.hu", "DAMAGE_SCOPE", "roof_tiles", null, "tetőcserepek harmada sérült meg", "a tetőcserepek harmada sérült meg a jégesőben"), claim("idojarasfigyelo.hu", "PROJECT_COST", 38, "million HUF", "38 millió forintos veszteséget", "A kárfelmérés 38 millió forintos veszteséget becsül."), claim("gazdaregio.hu", "PROJECT_COST", 38, "million HUF", "38 millió forintnyi kárt", "38 millió forintnyi kárt jeleztek")],
  }),
  scenario("H11", "Mikroműholdat jelentett be a kutatócsoport", [
    article("tudomanyma.hu", "Mikroműholdat jelentett be a kutatócsoport", "A Pannon Űrkutatási Labor bejelentette a Pille-7 mikroműhold fejlesztését. A közlemény szerint a fellövés 2029 júniusában várható. Dr. Sárközi Júlia idézetben úgy fogalmazott, hogy a fedélzeti szenzor elkészült. A kutatócsoport 90 százalékos tesztkészültséget közölt."),
    article("kutatovilag.hu", "Új szenzor a Pille-7 fedélzetén", "Dr. Sárközi Júlia szerint a Pille-7 szenzora már működőképes. A Pannon Űrkutatási Labor 2029 júniusára tervezi a startot, de a pontos nap még nem ismert.")
  ], {
    entities: [entity("H11:E1", "Pannon Űrkutatási Labor", "organization", "Pannon Űrkutatási Labor"), entity("H11:E2", "Pille-7", "project", "Pille-7"), entity("H11:E3", "Dr. Sárközi Júlia", "person", "Dr. Sárközi Júlia")],
    claims: [claim("tudomanyma.hu", "COMPLETION_PERCENT", 90, "%", "90 százalékos tesztkészültséget", "A kutatócsoport 90 százalékos tesztkészültséget közölt."), claim("tudomanyma.hu", "OPENING_DATE", "2029-06", "date", "fellövés 2029 júniusában várható", "a fellövés 2029 júniusában várható", { modality: "planned" }), claim("kutatovilag.hu", "OPENING_DATE", "2029-06", "date", "2029 júniusára tervezi a startot", "2029 júniusára tervezi a startot", { modality: "plan" })],
    events: [{ title: "Pille-7", evidence: "Pille-7 mikroműhold", membership: ["tudomanyma.hu"] }],
  }),
  scenario("H12", "Megváltozik az északi buszjárat", [
    article("kozlekedesma.hu", "Megváltozik az északi buszjárat", "A Hajnali Busztársaság december 1-jétől áthelyezné a 44-es járat végállomását. A Fenyves közben új megálló épült meg. Váradi Gergő szóvivő azt mondta, hogy a változás 2028 elején léphet hatályba. A társaság két külön eseményt jelölt: az új megálló átadását és az útvonal-átszervezést."),
    article("utvonalhir.hu", "Elkészült az új megálló", "A Fenyves közi megállót már átadták, a 44-es útvonalának módosítása azonban csak terv. Váradi Gergő szerint a korábbi decemberi dátumot januárra tolták.")
  ], {
    entities: [entity("H12:E1", "Hajnali Busztársaság", "organization", "Hajnali Busztársaság"), entity("H12:E2", "Fenyves köz", "location", "Fenyves köz"), entity("H12:E3", "Váradi Gergő", "person", "Váradi Gergő")],
    claims: [claim("kozlekedesma.hu", "SERVICE_START", "2028-01", "date", "2028 elején léphet hatályba", "a változás 2028 elején léphet hatályba", { modality: "possible" }), claim("utvonalhir.hu", "EVENT_STATUS", "completed", null, "megállót már átadták", "A Fenyves közi megállót már átadták.", { modality: "completed" }), claim("utvonalhir.hu", "SERVICE_START", "2028-01", "date", "decemberi dátumot januárra tolták", "a korábbi decemberi dátumot januárra tolták")],
    events: [{ title: "új megálló átadását", evidence: "új megálló átadását", membership: ["kozlekedesma.hu"] }, { title: "útvonal-átszervezést", evidence: "útvonal-átszervezést", membership: ["kozlekedesma.hu"] }],
    changesOverTime: [{ from: "2027-12", to: "2028-01" }],
  }),
];

function buildHeldoutDataset() {
  return { benchmarkVersion: "v22.heldout.1", contractVersion: "v22.2.heldout.1", scenarios };
}

module.exports = { buildHeldoutDataset };
