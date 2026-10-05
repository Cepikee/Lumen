"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const semantic = require("../../lib/v2/deterministic-semantic");
const provider = require("../../lib/v22/deterministic-text-provider.cjs");

test("generic conditional and background legal language does not create a concrete payment event", () => {
  const article = { source: { key: "round2.example" }, text: "Előfordulhat, hogy a tulajdonosnak kártérítést kell fizetnie." };
  assert.equal(provider.predictArticle(article).events.some((event) => event.title === "Fizetési kötelezettség"), false);
});

test("document edits are not vehicle repairs, while an explicit repair remains an event", () => {
  const document = provider.predictArticle({ source: "round2.example", text: "A jelentésbe tollal belejavítottak." });
  const repair = provider.predictArticle({ source: "round2.example", text: "A szerelő javította a féket." });
  assert.equal(document.events.some((event) => event.title === "Javítás"), false);
  assert.equal(repair.events.some((event) => event.title === "Javítás"), true);
});

test("scaled numeric mentions expose additive canonical values and delta/comparison semantics", () => {
  const mentions = semantic.extractNumericMentions("A szakasz 75 ezerrel hosszabb. A kalkuláció szerint 4,8 millió forintot ér.");
  const delta = mentions.find((item) => item.raw.includes("75"));
  const comparison = mentions.find((item) => item.raw.includes("4,8"));
  assert.deepEqual({ parsedValue: delta.parsedValue, multiplier: delta.multiplier, canonicalValue: delta.canonicalValue, valueKind: delta.valueKind }, { parsedValue: 75, multiplier: 1000, canonicalValue: 75000, valueKind: "delta" });
  assert.deepEqual({ value: comparison.value, unit: comparison.unit, canonicalValue: comparison.canonicalValue, canonicalUnit: comparison.canonicalUnit, valueKind: comparison.valueKind }, { value: 4.8, unit: "million HUF", canonicalValue: 4800000, canonicalUnit: "HUF", valueKind: "comparison" });
});

test("reported observation is kept separate from displayed, estimated and comparison values", () => {
  const claims = semantic.extractClaims([
    "A szerviz jelentése szerint a jármű 227 ezer kilométert futott.",
    "A műszerfal 168 ezer kilométert mutatott.",
    "A szakértő nagyjából 257 ezer kilométerre becsülte.",
  ].join(" "), "round2.example");
  assert.ok(claims.some((claim) => claim.status === "reported_observation"));
  assert.ok(claims.some((claim) => claim.status === "displayed"));
  assert.ok(claims.some((claim) => claim.status === "estimate"));
  const comparison = semantic.extractNumericMentions("A kalkuláció szerint az autó értéke 4,8 millió forint volt.");
  assert.equal(comparison[0].valueKind, "comparison");
});

test("month dates remain attached to the numeric observation in the same local sentence", () => {
  const claims = semantic.extractClaims("A szerviz 2018. december elején 227 ezer kilométert rögzített.", "round2.example");
  const claim = claims.find((item) => item.value === 227000);
  assert.ok(claim);
  assert.deepEqual(claim.temporal, { year: "2018", month: "12", relative: null, sequence: null });
});

test("explicit narrative relations require a verb and do not use sentence co-occurrence", () => {
  const entities = [{ mention: "Kiss Júlia", type: "person" }, { mention: "Solaris T5", type: "product" }];
  const acquired = semantic.extractRelations("Kiss Júlia megvásárolta a Solaris T5 járművet.", entities);
  const coOccurrence = semantic.extractRelations("Kiss Júlia és a Solaris T5 ugyanabban a közleményben szerepel.", entities);
  assert.deepEqual(acquired.map((relation) => [relation.subject, relation.predicate, relation.object]), [["Kiss Júlia", "ACQUIRED", "Solaris T5"]]);
  assert.deepEqual(coOccurrence, []);
});

test("multiple attributed speakers keep their own evidence spans", () => {
  const claims = semantic.extractClaims("Kiss Júlia szerint a jármű 12 kilométert futott. Nagy Péter állítja, hogy a jármű 15 kilométeres.", "round2.example");
  assert.equal(claims.length, 2);
  assert.deepEqual(claims.map((claim) => claim.attribution?.label), ["Kiss Júlia", "Nagy Péter"]);
  assert.ok(claims.every((claim) => claim.evidenceSpan.start >= 0 && claim.evidenceSpan.end > claim.evidenceSpan.start));
});
