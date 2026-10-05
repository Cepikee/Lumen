"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const semantic = require("../../lib/v2/deterministic-semantic");
const provider = require("../../lib/v22/deterministic-text-provider.cjs");

test("delta values never become count predicates across unrelated domains", () => {
  for (const text of [
    "A város 74 ezerrel több utast szállított.",
    "A cég 12 százalékkal több dolgozót foglalkoztat.",
    "A bevétel 300 millióval magasabb lett.",
    "A szakasz 20 kilométerrel hosszabb.",
  ]) {
    const claims = semantic.extractClaims(text, "round2.1");
    assert.equal(claims.some((claim) => /_COUNT$/u.test(claim.predicate)), false, text);
  }
});

test("numeric qualifiers retain lower, upper, range and approximate semantics", () => {
  const cases = [
    ["több mint 4,5 millió forint", "lower_bound"],
    ["legalább 10 km", "lower_bound"],
    ["kevesebb mint 3 nap", "upper_bound"],
    ["legfeljebb 5", "upper_bound"],
    ["10 és 20 között", "range"],
    ["körülbelül 7", "approximate"],
  ];
  for (const [text, expected] of cases) assert.equal(semantic.extractNumericMentions(text)[0]?.valueKind, expected, text);
});

test("local numeric scope keeps an exact observation separate from a later approximate delta", () => {
  const claims = semantic.extractClaims(
    "A szerviz azt válaszolta, hogy 2018. decemberben 227 ezer kilométer volt benne, vagyis nagyjából 74 ezerrel több.",
    "round2.1",
  );
  const exact = claims.find((claim) => claim.value === 227000);
  const delta = semantic.extractNumericMentions("A szerviz azt válaszolta, hogy nagyjából 74 ezerrel több.").find((mention) => mention.canonicalValue === 74000);
  assert.equal(exact?.status, "reported_observation");
  assert.equal(exact?.modality, "reported");
  assert.equal(exact?.uncertainty, false);
  assert.equal(delta?.valueKind, "approximate");
  assert.equal(claims.some((claim) => claim.canonicalValue === 74000 && claim.predicate === "VEHICLE_COUNT"), false);
});

test("legal amount stays absolute while reference-class mileage and values stay comparative", () => {
  const claims = semantic.extractClaims(
    "A vevő 1,5 millió forintot követelt az értékkülönbség miatt. A kalkuláció szerint a V60-hoz hasonló autók 169 ezer kilométerrel 4,8 millió forintot értek, 256 ezer kilométer után pedig nagyjából 4,4 millió forintot értek.",
    "round2.1",
  );
  const amount = claims.find((claim) => claim.canonicalValue === 1500000);
  assert.equal(amount?.valueKind, "absolute");
  assert.notEqual(amount?.status, "comparison");
  assert.equal(claims.filter((claim) => claim.subject === "reference_class").length >= 2, true);
});

test("broad interpersonal verbs do not create PARTNER_OF relations", () => {
  const entities = [{ mention: "Lajos", type: "person" }, { mention: "Zoltán", type: "person" }];
  for (const verb of ["megállapodott", "tárgyalt", "találkozott", "szerződést kötött", "üzleti partnere", "élettársa"]) {
    const relations = semantic.extractRelations(`Lajos ${verb} Zoltánnal.`, entities);
    assert.equal(relations.some((relation) => relation.predicate === "PARTNER_OF"), false, verb);
  }
});

test("acquisition event exposes only explicit article participants", () => {
  const prediction = provider.predictArticle({
    source: "round2.1",
    text: "Zoltán 2019 májusában vásárolt egy Volvo V60 PHEV plug-in hibrid autót.",
  });
  const event = prediction.events.find((item) => item.title === "Adásvétel");
  assert.deepEqual(new Set(event?.participants), new Set(["Zoltán", "Volvo V60 PHEV"]));
});

test("duplicated headline is not emitted twice as downstream numeric data", () => {
  const title = "Zoltán több mint 4,5 millió forintot fizet";
  const prediction = provider.predictArticle({ source: "round2.1", text: `${title}\n\n${title}\n\nA cikk törzse további adatot nem tartalmaz.` });
  const headlineValues = prediction.numericMentions.filter((item) => item.canonicalValue === 4500000);
  assert.ok(headlineValues.length <= 1);
});
