"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const semantic = require("../../lib/v2/deterministic-semantic");

function framesFor(text) {
  const entities = semantic.extractEntities(text);
  return { entities, frames: semantic.extractSemanticFrames(text, entities) };
}

const MULTI_SUBJECT_CASES = [
  { text: "Alfa Energia Zrt. bevétele 12 millió forint, míg Béta Művek Zrt. bevétele 9 millió forint volt.", expected: [["alfa energia", 12000000], ["béta művek", 9000000]] },
  { text: "Nagy Dóra 9,81 másodpercet, míg Kiss Emese 9,95 másodpercet ért el.", expected: [["nagy dóra", 9.81], ["kiss emese", 9.95]] },
  { text: "A Duna Kórház 120 beteget, a Tisza Klinika pedig 95 beteget kezelt.", expected: [["duna kórház", 120], ["tisza klinika", 95]] },
  { text: "Dunaországban 12 százalékos, míg Hegyországban 8 százalékos tarifa lépett életbe.", expected: [["dunaország", 12], ["hegyország", 8]] },
  { text: "A Napfény Iskola 82 pontot, a Holdfény Iskola pedig 76 pontot ért el.", expected: [["napfény iskola", 82], ["holdfény iskola", 76]] },
  { text: "Pécs városban 18 fokot, míg Szeged városban 21 fokot mértek.", expected: [["pécs", 18], ["szeged", 21]] },
];

test("Round 2 splits multi-subject numeric propositions across unrelated domains", () => {
  let expectedCount = 0;
  let matchedCount = 0;
  for (const fixture of MULTI_SUBJECT_CASES) {
    const { frames } = framesFor(fixture.text);
    const actual = frames.flatMap((frame) => frame.numericArguments.map((argument) => [frame.subject?.normalized, argument.subject?.normalized, argument.canonicalValue]));
    expectedCount += fixture.expected.length;
    for (const [subject, value] of fixture.expected) {
      if (actual.some(([frameSubject, numericSubject, actualValue]) => frameSubject === subject && numericSubject === subject && actualValue === value)) matchedCount += 1;
    }
    assert.ok(frames.every((frame) => frame.numericArguments.every((argument) => !frame.subject || !argument.subject || frame.subject.normalized === argument.subject.normalized)));
  }
  assert.equal(matchedCount, expectedCount);
});

test("Round 2 keeps media and official source roles separate from entity identity", () => {
  const text = "A Hírügynökség azt írta, hogy új terv készül. A minisztérium szerint a program késik.";
  const { entities, frames } = framesFor(text);
  const media = entities.find((entity) => entity.normalized === "hírügynökség");
  const official = entities.find((entity) => entity.normalized === "minisztérium");
  assert.equal(media?.identity, "same");
  assert.equal(media?.sourceRole, "media_source");
  assert.equal(official?.identity, "same");
  assert.equal(official?.sourceRole, "official_source");
  assert.ok(frames.some((frame) => frame.attribution?.label === "Hírügynökség" && frame.attribution.sourceRole === "media_source"));
  assert.ok(frames.some((frame) => frame.attribution?.label === "minisztérium" && frame.attribution.sourceRole === "official_source"));
});

test("Round 2 attribution never promotes punctuation, clauses, or unresolved pronouns", () => {
  assert.equal(semantic.attributionFor("Szerinte jövőre elkészülhet." )?.sourceRole, "unresolved_pronoun");
  assert.equal(semantic.attributionFor("„Elkészül” – hangzott el."), null);
  const named = semantic.attributionFor("Kovács Anna azt mondta, hogy elkészült.");
  assert.equal(named?.label, "Kovács Anna");
  assert.equal(named?.reportingVerb, "azt mondta");
});

test("Round 2 separates admission and denial propositions without duplicates", () => {
  const { frames } = framesFor("Kovács Anna elismerte a késést, de tagadta a csalást.");
  assert.equal(frames.length, 2);
  assert.deepEqual(frames.map((frame) => [frame.action, frame.actor?.normalized, frame.polarity, frame.attribution?.reportingVerb]), [
    ["admission", "kovács anna", "affirmed", "elismerte"],
    ["denial", "kovács anna", "denied", "tagadta"],
  ]);
  assert.equal(new Set(frames.map((frame) => `${frame.action}|${frame.propositionSpan.start}|${frame.propositionSpan.end}`)).size, 2);
});

test("Round 2 enforces promise and conditional consistency", () => {
  const conditional = framesFor("Ha megválasztják, Kovács Anna támogatást adna az iskoláknak.").frames[0];
  assert.equal(conditional.status, "conditional");
  assert.equal(conditional.conditionality, true);
  assert.equal(conditional.modality, "conditional");
  const promised = framesFor("Kovács Anna megígérte, hogy jövőre támogatást ad az iskoláknak.").frames[0];
  assert.notEqual(promised.status, "completed");
  assert.ok(["conditional", "planned"].includes(promised.status));
  assert.ok(promised.time?.relative === "jövőre");
});

test("Round 2 conservatively resolves inflected names inside one article", () => {
  const entities = semantic.extractEntities("Kovács Anna nyilatkozott. Kovács Annának később díjat adtak. Kovács Annáról portré készült.");
  const anna = entities.filter((entity) => entity.normalized === "kovács anna");
  assert.equal(anna.length, 1);
  assert.deepEqual(new Set(anna[0].surfaceForms), new Set(["Kovács Anna", "Kovács Annának", "Kovács Annáról"]));
});

test("Round 2 structural segmentation blocks byline and caption leakage", () => {
  const text = [
    "Minta hírcím",
    "Kovács Anna",
    "Kovács Anna",
    "A helyszíni felvétel – Fotó: Fényes Béla / MTI",
    "Másolás",
    "Vágólapra másolva",
    "Nagy Dóra Pécs városban nyilatkozott.",
  ].join("\n");
  const entities = semantic.extractEntities(text);
  assert.ok(entities.some((entity) => entity.normalized === "nagy dóra" && entity.type === "person"));
  assert.ok(entities.some((entity) => entity.normalized === "pécs" && entity.type === "location"));
  assert.equal(entities.some((entity) => /kovács anna|fényes béla|mti nagy|nagy dóra pécs/iu.test(entity.normalized)), false);
});

test("Round 2 entity precision/recall adversarial fixture meets the safety floor", () => {
  const text = "Kovács Anna, a Napfény Iskola igazgatója Szeged városban nyilatkozott. Kovács Béla, a Holdfény Iskola tanára Pécs városban válaszolt.";
  const expected = new Set(["person|kovács anna", "organization|napfény iskola", "location|szeged", "person|kovács béla", "organization|holdfény iskola", "location|pécs"]);
  const actual = new Set(semantic.extractEntities(text).map((entity) => `${entity.type}|${entity.normalized}`));
  const truePositive = [...actual].filter((key) => expected.has(key)).length;
  const precision = truePositive / actual.size;
  const recall = truePositive / expected.size;
  assert.ok(precision >= 0.9, `entity precision ${precision}`);
  assert.ok(recall >= 0.8, `entity recall ${recall}`);
});

test("Round 2 frame quality metrics meet the curated safety floor", () => {
  let expected = 0;
  let correct = 0;
  let predicted = 0;
  for (const fixture of MULTI_SUBJECT_CASES) {
    const frames = framesFor(fixture.text).frames.filter((frame) => frame.numericArguments.length);
    predicted += frames.length;
    expected += fixture.expected.length;
    for (const frame of frames) {
      if (fixture.expected.some(([subject, value]) => frame.subject?.normalized === subject && frame.numericArguments.length === 1 && frame.numericArguments[0].subject?.normalized === subject && frame.numericArguments[0].canonicalValue === value)) correct += 1;
    }
  }
  const precision = correct / predicted;
  const recall = correct / expected;
  assert.ok(precision >= 0.95, `frame precision ${precision}`);
  assert.ok(recall >= 0.9, `frame recall ${recall}`);
  assert.equal(correct, expected);
});
