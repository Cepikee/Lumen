#!/usr/bin/env node
"use strict";

// A script kizárólag a lokális utom_dev adatbázist érintheti. Productionben
// és stagingben szándékosan megtagadja a futást.
const { loadMigrations, applyMigrations } = require("../db/migration-core.cjs");
const crypto = require("node:crypto");

function assertLocalDemoTarget(env = process.env) {
  if (env.UTOM_DEV_DEMO_BOOTSTRAP !== "true") throw new Error("A demo bootstraphez UTOM_DEV_DEMO_BOOTSTRAP=true szükséges");
  if (env.NODE_ENV === "production") throw new Error("Demo bootstrap productionben tiltott");
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(String(env.DB_HOST || ""))) throw new Error("Demo bootstrap csak loopback DB_HOST-tal futhat");
  if (String(env.DB_NAME || "") !== "utom_dev") throw new Error("Demo bootstrap csak DB_NAME=utom_dev célponton futhat");
}

async function insertMany(connection, table, columns, rows, batchSize = 100) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = batch.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    await connection.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${values}`, batch.flat());
  }
}

// A három első demo-cikk ugyanarról az eseményről szóló, saját készítésű,
// gazdag kontrollált fixture. A semantic réteg továbbra is deterministic mockot
// használ, de a UI és az ingestion valódi, többmezős cikk-tartalmat kap.
function buildTraceArticleBody(variant) {
  const amount = variant === 0 ? "120 millió forint" : variant === 1 ? "150 millió forint" : "nem közölt beruházási összeget";
  const amountDetail = variant === 0
    ? "A költségvetési táblázat 120 millió forintos kerettel számol."
    : variant === 1
      ? "A második szerkesztőség szerint a teljes keret 150 millió forint, mert a tartalékot is beleszámították."
      : "A harmadik beszámoló nem közölt összeget, csak azt írta, hogy a keret több ütemben áll rendelkezésre.";
  const paragraphs = [
    `A Tiszapart városában működő folyóparti vízvédelmi program új szakasza 2026. október 4-én reggel nyolc órakor indult. A kezdeményezést Szabó Anna projektvezető és Kovács Bence önkormányzati mérnök ismertette a városházán. A munkát a Tiszamenti Vízőr Zrt. és a Folyóparti Egyetem kutatócsoportja közösen készítette elő.`,
    `A program előzménye egy 2025. decemberi árhullám, amely a Tisza alacsonyabb fekvésű utcáiban több pincét elöntött. A városi jelentés szerint akkor 18 centiméterrel emelkedett meg a vízszint két óra alatt, és 42 ingatlanban keletkezett kisebb kár. Súlyos sérülés nem történt, de a lakók azóta folyamatosabb riasztást kértek.`,
    `A mostani terv két helyszínt érint: a Tiszapart északi zsilipjét, valamint a Kerekes-rét új mérőállomását. Az első helyszínen három automata érzékelőt telepítenek, a másodikon pedig egy napelemes adatátviteli pontot. A mérőállomások ötpercenként küldik az adatokat, így a központ a korábbi óránkénti jelentések helyett közel valós időben láthatja a változásokat.`,
    `A műszaki leírás szerint az első ütemben 6,4 kilométer optikai kábelt és 14 új jelzőtáblát helyeznek el. A kivitelező 38 szakemberrel dolgozik, közülük 12 helyi vállalkozó. A munkálatok idején a gáton legfeljebb 20 kilométeres sebességgel lehet majd közlekedni, a kerékpárosok számára pedig ideiglenes kerülőutat jelölnek ki.`,
    `${amountDetail} A források abban egyetértenek, hogy az összeg magában foglalja a szenzorokat, az adatkapcsolatot és a hat hónapos próbaüzemet. A különbség oka az, hogy az egyik fél a karbantartási tartalékot külön soron, a másik viszont a beruházás részeként számolja el.`,
    `Szabó Anna azt mondta: „A lakók nem egy újabb ígéretet kérnek, hanem olyan adatot, amelyet mindenki ellenőrizhet.” Kovács Bence hozzátette, hogy a nyilvános műszerfalon óránként megjelenik majd az aktuális vízállás, a szélsebesség és a csapadék mennyisége. A rendszer riasztási szintjeit előre közzéteszik.`,
    `A Folyóparti Egyetem biológusa, Nagy Júlia szerint a mérőpontok a madárvédelmi területet is érintik, ezért a telepítés csak szeptember és március között végezhető. A szakértő úgy véli, hogy a program csökkentheti a késői riasztások számát, de hangsúlyozta: egyetlen szezon adatai alapján még nem lehet biztos következtetést levonni.`,
    `A kivitelezés első napján fél órára lezárták az északi zsiliphez vezető utat. A lezárás 9 óra 10 perckor megszűnt, és a próbamérés 9 óra 35 perckor már továbbította az első adatcsomagot. A rendszer 97 százalékos jelminőséget mutatott, két érzékelőnél azonban újrakalibrálást kellett indítani.`,
    `A város korábbi közleménye nem állította, hogy a program önmagában megakadályoz minden árvizet. A cél az, hogy a kritikus vízszint elérése előtt legalább 45 perccel értesítés érkezzen a diszpécserhez és az érintett lakókhoz. Az első riasztási küszöb 372 centiméter, a második 401 centiméter lesz.`,
    `A munkaterv szerint október 18-án kezdődik a próbaüzem, november 2-án pedig nyilvános ellenőrző napot tartanak. Decemberben értékelik a három hónap alatt gyűjtött adatokat, majd 2027 januárjában döntenek a további hat mérőpont telepítéséről. Ezt a második ütemet a mostani beszámolók még csak tervként kezelik.`,
    `A helyi gazdák attól tartanak, hogy a munkagépek a földutakon később is fennakadást okoznak. A projektvezető szerint a kivitelező minden pénteken egyeztet a gazdákkal, és a járművek útvonalát úgy módosítják, hogy a betakarítási időszakban ne zárjanak le hosszabb szakaszt. Panasz esetén külön telefonszámot működtetnek.`,
    `A három beszámoló eltérően értékeli a költségvetést és a próbaüzem kiterjedését, de ugyanazokat a helyszíneket, szereplőket és időpontokat említi. A közös adatok alapján egyetlen eseményhez kapcsolódnak, a pénzügyi eltérés pedig külön forrásállításként marad meg. A kontrollált fixture célja éppen ennek a különbségnek a megőrzése, nem valamelyik változat automatikus kiválasztása.`,
    `A nyilvános adatok mellett a projekt külön adatvédelmi jegyzőkönyvet is kapott. A szenzorok nem rögzítenek hangot vagy arcot, a műszerfal pedig csak összesített mérési értékeket mutat. A naplókat kilencven napig őrzik, ezután a személyhez nem köthető műszaki statisztika marad meg. A lakossági értesítés önkéntes, de vészhelyzetben a katasztrófavédelem közvetlen üzenetet küldhet.`,
    `Nagy Júlia kutatócsoportja a próbaüzem végén összeveti a mérőállomások adatait a folyóparti csapadékmérőkkel. A vizsgálatban külön jelölik a hibás vagy hiányos adatcsomagokat, és nem pótolják őket automatikusan átlaggal. Ha egy állomás három egymást követő ciklusban nem jelentkezik, a rendszer karbantartási jelzést küld, de az előző érvényes mérés külön megőrzött állapotként látható marad.`,
    `Kovács Bence szerint a következő évben nyílt műszaki fórumot tartanak, ahol a lakók kérdezhetnek a küszöbértékekről és a költségekről. Szabó Anna azt tervezi, hogy a közbeszerzési számlákat a próbaüzem után közérthető táblázatban teszi közzé. A két nyilatkozat jövőbeli vállalás, ezért a trace külön időbélyeggel és forrás-attribúcióval kezeli őket, nem keveri össze a már megtörtént telepítéssel.`,
    `A helyszíni ellenőrzés végén 16 óra 20 perckor mindhárom szenzor ugyanazt a 318 centiméteres vízállást jelezte. A vezeték nélküli kapcsolat késleltetése 2,1 másodperc volt, a tartalék akkumulátor pedig 86 százalékon állt. Ezek az adatok a kontrollált történet stabil technikai részét képezik; a pénzügyi összeg és a későbbi bővítés viszont szándékosan eltérő vagy bizonytalan állításként marad a három forrás között.`
  ];
  return paragraphs.join("\n\n");
}

async function resetData(connection) {
  const [rows] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME <> 'schema_migrations'");
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  try {
    for (const row of rows) await connection.query(`DELETE FROM \`${String(row.TABLE_NAME).replace(/`/g, "``")}\``);
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
  }
}

async function main() {
  const mysql = require("mysql2/promise");
  const bcrypt = require("bcryptjs");
  assertLocalDemoTarget();
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const migrations = loadMigrations();
    await applyMigrations(connection, migrations);
    await resetData(connection);

    const now = new Date("2026-10-04T10:00:00Z");
    const sources = [
      ["telex.hu", "Telex", "https://telex.hu", 1],
      ["24.hu", "24.hu", "https://24.hu", 1],
      ["index.hu", "Index", "https://index.hu", 1],
      ["hvg.hu", "HVG", "https://hvg.hu", 1],
      ["portfolio.hu", "Portfolio", "https://www.portfolio.hu", 1],
      ["444.hu", "444.hu", "https://444.hu", 1],
      ["origo.hu", "Origo", "https://www.origo.hu", 1],
      ["disabled", "Kikapcsolt forrás", "https://disabled.example.invalid", 0],
      ["helyi", "Helyi hírek", "https://helyi.example.invalid", 1],
      ["forras-10", "Forrás 10", "https://10.example.invalid", 1],
      ["forras-11", "Forrás 11", "https://11.example.invalid", 1],
      ["forras-12", "Forrás 12", "https://12.example.invalid", 1],
    ];
    await insertMany(connection, "sources", ["slug", "name", "homepage_url", "is_active"], sources);
    const [sourceRows] = await connection.query("SELECT id,slug FROM sources ORDER BY id");
    const sourceId = Object.fromEntries(sourceRows.map((row) => [row.slug, Number(row.id)]));
    await insertMany(connection, "clusters", ["first_published_at", "first_source", "title"], Array.from({ length: 12 }, (_, i) => [new Date(now.getTime() - i * 86400000), sources[i % 3][0], `Klaszter ${i + 1}`]));

    const articles = Array.from({ length: 40 }, (_, i) => {
      const sourceSlug = i === 39 ? null : sources[i % sources.length][0];
      const category = ["politika", "gazdaság", "technológia", "sport"][i % 4];
      const content = i < 3 ? buildTraceArticleBody(i) : `Valósághű demo tartalom ${i + 1}. ${"részletes adat ".repeat(i % 8 + 3)}`;
      return [`Demo cikk ${i + 1} – ${i % 5 === 0 ? "hosszú magyar cím árvíztűrő tükörfúrógéppel" : "rövid cím"}`, `https://demo.example.invalid/article/${i + 1}`, content, new Date(now.getTime() - i * 6 * 3600000), sourceSlug ? sourceId[sourceSlug] : null, sourceSlug, category, i % 3 === 0 ? "pending" : "done", i % 3 === 0 ? 0 : 1, i % 12 + 1];
    });
    await insertMany(connection, "articles", ["title", "url_canonical", "content_text", "published_at", "source_id", "source", "category", "status", "processed", "cluster_id"], articles);
    const [articleRows] = await connection.query("SELECT id FROM articles ORDER BY id");
    const articleIds = articleRows.map((row) => Number(row.id));
    const summaries = articleIds.filter((id) => id % 7 !== 0).map((id) => [id, `Összefoglaló ${id}: rövid, közérthető demo összefoglaló.`, `Részletes összefoglaló ${id}. ${"háttérinformáció ".repeat(20)}`, ["politika", "gazdaság", "technológia", "sport"][id % 4], sources[id % 3][0], id % 4 === 0 ? null : 0.12]);
    await insertMany(connection, "summaries", ["article_id", "content", "detailed_content", "category", "source", "plagiarism_score"], summaries);
    await insertMany(connection, "keywords", ["article_id", "keyword", "category"], articleIds.flatMap((id) => [[id, "demo", "általános"], [id, `téma-${id % 6}`, "téma"]]));
    await insertMany(connection, "trends", ["keyword", "frequency", "period", "category", "source"], Array.from({ length: 18 }, (_, i) => [`téma-${i % 6}`, i + 1, i % 2 ? "weekly" : "daily", ["politika", "gazdaság", "technológia", "sport"][i % 4], sources[i % 3][0]]));
    await insertMany(connection, "speed_index", ["source", "avg_delay_minutes", "median_delay_minutes"], sources.slice(0, 3).map((item, i) => [item[0], i + 1.5, i + 1]));
    await insertMany(connection, "speed_index_history", ["source", "delay_minutes", "created_at"], Array.from({ length: 24 }, (_, i) => [sources[i % 3][0], i % 9, new Date(now.getTime() - i * 3600000)]));

    const passwordHash = await bcrypt.hash("Demo-password-2026!", 10);
    const pinHash = await bcrypt.hash("2468", 10);
    await insertMany(connection, "users", ["email", "nickname", "password_hash", "pin_code", "email_verified", "is_premium", "premium_until", "premium_tier"], [
      ["free.demo@example.invalid", "demo-free", passwordHash, pinHash, 1, 0, null, null],
      ["premium.demo@example.invalid", "demo-premium", passwordHash, pinHash, 1, 1, "2099-01-01 00:00:00", "demo"],
      ["expired.demo@example.invalid", "demo-expired", passwordHash, pinHash, 1, 1, "2020-01-01 00:00:00", "demo"],
    ]);

    const createdAt = now.toISOString().slice(0, 23).replace("T", " ");
    const entityRows = [
      ["person", "Demo szereplő", "demo szereplő", "accepted", 0.95],
      ["organisation", "Demo szervezet", "demo szervezet", "accepted", 0.9],
      ["place", "Demo hely", "demo hely", "review", 0.55],
      ["person", "Ismeretlen jelölt", "ismeretlen jelölt", "unresolved", 0.4],
    ];
    const entityIds = [];
    for (const [type, canonical, normalized, status, confidence] of entityRows) {
      const [result] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,confidence_current,first_observed_at,last_observed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", [type, canonical, normalized, "hu", status, confidence, createdAt, createdAt, createdAt, createdAt]);
      entityIds.push(Number(result.insertId));
    }
    const aliases = entityIds.flatMap((id, index) => [[id, `Demo alias ${index + 1}`, `demo alias ${index + 1}`, "hu", "common", index === 3 ? "review" : "accepted", 0.8, createdAt, createdAt], [id, `Rövid ${index + 1}`, `rövid ${index + 1}`, "hu", "short", "accepted", 0.75, createdAt, createdAt]]);
    await insertMany(connection, "v2_entity_aliases", ["entity_id", "alias", "normalized_alias", "language", "alias_type", "status", "confidence", "created_at", "updated_at"], aliases);
    const relationRows = [
      [entityIds[0], "works_for", entityIds[1], null, "active", 0.91, "rel-demo-1"],
      [entityIds[0], "located_in", entityIds[2], null, "active", 0.82, "rel-demo-2"],
      [entityIds[1], "has_value", null, JSON.stringify({ value: 42, unit: "db" }), "review", 0.6, "rel-demo-3"],
    ];
    const relationIds = [];
    for (const row of relationRows) {
      const [result] = await connection.execute("INSERT INTO v2_entity_relations (subject_entity_id,predicate,object_entity_id,object_value,status,confidence,first_observed_at,last_observed_at,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [row[0], row[1], row[2], row[3], row[4], row[5], createdAt, createdAt, row[6], createdAt, createdAt]);
      relationIds.push(Number(result.insertId));
    }
    await insertMany(connection, "v2_relation_evidence", ["relation_id", "article_id", "source_id", "evidence_hash", "text_span", "support_type", "confidence", "created_at"], relationIds.map((id, index) => [id, articleIds[index], sourceId[sources[index][0]], crypto.createHash("sha256").update(`relation-${index + 1}`).digest("hex"), `Kapcsolati bizonyíték ${index + 1}`, index === 2 ? "uncertain" : "support", 0.8, createdAt]));
    const [groupResult] = await connection.execute("INSERT INTO v2_claim_groups (subject_entity_id,predicate,time_scope_key,resolution_status,display_policy,created_at,updated_at) VALUES (?,?,?,?,?,?,?)", [entityIds[0], "population", "2026", "conflict", "show_all", createdAt, createdAt]);
    const claimGroupId = Number(groupResult.insertId);
    const claimTypes = ["shared", "source_only", "numeric", "numeric", "categorical", "boolean", "entity", "temporal", "attribution", "uncertain", "negated", "unit"];
    const claimIds = [];
    for (let index = 0; index < claimTypes.length; index++) {
      const type = claimTypes[index];
      const isNumericConflict = type === "numeric";
      const articleIndex = isNumericConflict ? (index === 2 ? 0 : 1) : index % 3;
      const sourceIndex = isNumericConflict ? (index === 2 ? 0 : 1) : index % sources.length;
      const value = isNumericConflict ? (index === 2 ? "120" : "150") : type === "unit" ? "100" : type === "boolean" ? "true" : type === "entity" ? "Demo szervezet" : `demo-${type}`;
      const [result] = await connection.execute("INSERT INTO v2_claims (subject_entity_id,predicate,object_entity_id,value_json,normalized_value,claim_type,article_id,source_id,valid_from,observed_at,publication_time,status,confidence,claim_group_id,observation_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [entityIds[0], isNumericConflict || type === "unit" ? "population" : `predicate_${type}`, type === "entity" ? entityIds[1] : null, JSON.stringify({ value, unit: type === "unit" ? "km" : type === "numeric" ? "million HUF" : null }), value, type, articleIds[articleIndex], sourceId[sources[sourceIndex][0]], createdAt, createdAt, createdAt, "observed", index === 3 ? 0.62 : 0.88, isNumericConflict ? claimGroupId : null, `claim-demo-${index + 1}`, createdAt, createdAt]);
      claimIds.push(Number(result.insertId));
    }
    await insertMany(connection, "v2_claim_evidence", ["claim_id", "article_id", "source_id", "text_span", "span_hash", "evidence_type", "support_type", "confidence", "publication_time", "created_at"], claimIds.map((id, index) => {
      const isNumericConflict = claimTypes[index] === "numeric";
      const articleIndex = isNumericConflict ? (index === 2 ? 0 : 1) : index % 3;
      const sourceIndex = isNumericConflict ? (index === 2 ? 0 : 1) : index % sources.length;
      return [id, articleIds[articleIndex], sourceId[sources[sourceIndex][0]], `Bizonyító szövegrészlet ${index + 1}`, crypto.createHash("sha256").update(`claim-${index + 1}`).digest("hex"), index === 9 ? "uncertainty" : "quote", index === 10 ? "contradict" : "support", index === 3 ? 0.62 : 0.88, createdAt, createdAt];
    }));
    await insertMany(connection, "v2_conflicts", ["conflict_type", "fingerprint", "scope_type", "scope_id", "severity", "state", "explanation_json", "detected_at", "created_at", "updated_at"], [["numeric", "a".repeat(64), "claim_group", claimGroupId, "high", "open", JSON.stringify({ winner: null, reason: "equal evidence" }), createdAt, createdAt, createdAt], ["categorical", "b".repeat(64), "claim_group", claimGroupId, "medium", "open", JSON.stringify({ winner: null, reason: "source disagreement" }), createdAt, createdAt, createdAt]]);
    const eventIds = [];
    for (let index = 0; index < 3; index++) {
      const [result] = await connection.execute("INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,start_at,end_at,first_observed_at,last_observed_at,confidence,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", ["news", `Demo esemény ${index + 1}`, `demo-esemény-${index + 1}`, "active", createdAt, createdAt, createdAt, createdAt, 0.9, createdAt, createdAt]);
      eventIds.push(Number(result.insertId));
    }
    await insertMany(connection, "v2_event_entities", ["event_id", "entity_id", "role", "confidence", "created_at"], eventIds.map((id, index) => [id, entityIds[index % 3], "subject", 0.9, createdAt]));
    await insertMany(connection, "v2_event_articles", ["event_id", "article_id", "membership_type", "confidence", "first_observed_at", "last_observed_at", "created_at"], [[eventIds[0], articleIds[0], "primary", 0.9, createdAt, createdAt, createdAt], [eventIds[0], articleIds[1], "related", 0.8, createdAt, createdAt, createdAt], [eventIds[0], articleIds[2], "related", 0.78, createdAt, createdAt, createdAt], [eventIds[1], articleIds[4], "primary", 0.9, createdAt, createdAt, createdAt], [eventIds[2], articleIds[4], "related", 0.7, createdAt, createdAt, createdAt]]);
    const [timelineResult] = await connection.execute("INSERT INTO v2_timelines (owner_type,owner_id,visibility,created_at,updated_at) VALUES ('event',?,'public',?,?)", [eventIds[0], createdAt, createdAt]);
    await insertMany(connection, "v2_timeline_items", ["timeline_id", "item_type", "item_id", "valid_at", "display_at", "confidence", "visibility", "ordering_key", "created_at"], Array.from({ length: 25 }, (_, index) => [Number(timelineResult.insertId), "article", articleIds[index], createdAt, createdAt, 0.7 + (index % 3) / 10, "public", String(index + 1).padStart(4, "0"), createdAt]));
    console.log(JSON.stringify({ schema: migrations.at(-1).version, sources: sources.length, articles: articles.length, summaries: summaries.length, users: 3, entities: entityIds.length, aliases: aliases.length, relations: relationIds.length, claims: claimIds.length, claimEvidence: claimIds.length, events: eventIds.length, timelineItems: 25, conflicts: 2, paidAiCalls: 0, paymentCalls: 0 }));
  } finally { await connection.end(); }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { assertLocalDemoTarget, buildTraceArticleBody };
