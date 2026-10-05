"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const semantic = require("../../lib/v2/deterministic-semantic");
const provider = require("../../lib/v22/deterministic-text-provider.cjs");

const NUMERIC_PREDICATE = /(?:_COUNT|_AMOUNT|_COST|PERCENT|DISTANCE|WAITING_DAYS|SPEED_LIMIT)$/u;

test("numeric predicates never emit null, undefined or non-finite values", () => {
  const text = "A közlemény a külföldi járművek és a javítás kockázatáról beszél, konkrét darabszám nélkül.";
  const claims = semantic.extractClaims(text, "health.example");
  assert.ok(claims.every((claim) => !NUMERIC_PREDICATE.test(claim.predicate) || (claim.value != null && Number.isFinite(claim.value))));
  assert.equal(claims.some((claim) => claim.predicate === "VEHICLE_COUNT"), false);
});

test("generic metadata segmentation keeps bylines and photo credits out of entity mentions", () => {
  const text = [
    "Kórházi fejlesztés új eszközökkel",
    "EgészségMa",
    "2026. október 5.",
    "Fotó: Sajtóiroda / EgészségMa",
    "Kiss Júlia",
    "Másolás",
    "Vágólapra másolva",
    "",
    "Kiss Júlia kutató szerint a klinika új berendezést kapott.",
  ].join("\n");
  const entities = semantic.extractEntities(text);
  assert.ok(entities.some((entity) => entity.normalized === "kiss júlia"));
  assert.equal(entities.some((entity) => /egészségma|sajtóiroda/iu.test(entity.normalized)), false);
});

test("Hungarian numeric mention layer handles scales, currencies, spacing and ranges", () => {
  const mentions = semantic.extractNumericMentions("A labor 153 ezer kilométert, 227 ezer km-t és 1,5 millió forintot mért; a díj 13\u202f700 euró, a vizsgálat 1-től 3 évig tart.");
  assert.ok(mentions.some((item) => item.value === 153000 && item.unit === "km"));
  assert.ok(mentions.some((item) => item.value === 227000 && item.unit === "km"));
  assert.ok(mentions.some((item) => item.value === 1.5 && item.unit === "million HUF"));
  assert.ok(mentions.some((item) => item.value === 13700 && item.unit === "EUR"));
  assert.ok(mentions.some((item) => item.value && item.value.from === 1 && item.value.to === 3 && item.unit === "year"));
});

test("ambiguous legal money claims abstain instead of using PROJECT_COST", () => {
  const text = "A vevő ügyvédje 1,5 millió forintot követelt a javítások és az értékkülönbség miatt.";
  const claims = semantic.extractClaims(text, "birosag.example");
  assert.equal(claims.some((claim) => claim.predicate === "PROJECT_COST"), false);
  assert.equal(claims.some((claim) => claim.value == null), false);
});

test("attribution and uncertainty remain attached to a source-local numeric claim", () => {
  const text = "Nagy Anna szerint a vasúti szerelvény 12 ezer kilométert futott. Az igazságügyi szakértő becslése szerint a szakasz 2,3 kilométeres lehetett.";
  const claims = semantic.extractClaims(text, "vasut.example");
  assert.ok(claims.some((claim) => claim.attribution?.label === "Nagy Anna"));
  assert.ok(claims.some((claim) => claim.uncertainty === true && claim.modality === "possible"));
});

test("role and product appositions generalize across transport and education copy", () => {
  const text = "A Közlekedési Hivatal közleménye szerint Barta Réka mérnök a Solaris T5 járművet vizsgálta. A Béke téri iskola 75 százalékos készültségnél tart.";
  const entities = semantic.extractEntities(text);
  assert.ok(entities.some((entity) => entity.normalized === "közlekedési hivatal" && entity.type === "organization"));
  assert.ok(entities.some((entity) => entity.normalized === "barta réka" && entity.type === "person"));
  assert.ok(entities.some((entity) => entity.normalized === "solaris t5" && entity.type === "product"));
  assert.ok(semantic.extractClaims(text, "oktatas.example").some((claim) => claim.predicate === "COMPLETION_PERCENT" && claim.value === 75));
});

test("generic narrative events cover acquisition, court, repair and sport wording", () => {
  const article = {
    source: { key: "general.example" },
    text: "A vállalat megvásárolta a gyárat. A bíróság megállapította a szerződésszegést. A szerelő kicserélte az akkumulátort. A stadionban a döntő elmaradt.",
  };
  const events = provider.predictArticle(article).events;
  assert.ok(events.some((event) => event.title === "Adásvétel"));
  assert.ok(events.some((event) => event.title === "Bírósági döntés"));
  assert.ok(events.some((event) => event.title === "Javítás"));
});

test("REAL_WORLD_001 after-hardening path preserves first-pass artifacts and removes the null numeric claim", () => {
  const root = path.resolve(__dirname, "../..");
  const source = fs.readFileSync(path.join(root, "docs/UTOM_V2_2/real_world/001_source_article.txt"), "utf8");
  const freeze = JSON.parse(fs.readFileSync(path.join(root, "docs/UTOM_V2_2/real_world/001_state_freeze.json"), "utf8"));
  const firstPassBytes = fs.readFileSync(path.join(root, "docs/UTOM_V2_2/real_world/001_first_pass_raw.json"));
  const prediction = provider.predictArticle({ source: { key: "real-world-001" }, text: source });
  assert.equal(require("node:crypto").createHash("sha256").update(source).digest("hex").toUpperCase(), freeze.sourceArticleSha256);
  assert.ok(prediction.numericMentions.some((item) => item.value === 153000 && item.unit === "km"));
  assert.equal(prediction.claims.some((claim) => claim.predicate === "VEHICLE_COUNT" && claim.value == null), false);
  assert.equal(prediction.entities.some((entity) => entity.normalized === "telex zoltán"), false);
  assert.ok(prediction.events.length >= 3);
  assert.ok(firstPassBytes.length > 0);
});
