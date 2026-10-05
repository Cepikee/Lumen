"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const semantic = require("../../lib/v2/deterministic-semantic");
const provider = require("../../lib/v22/deterministic-text-provider.cjs");

function assertRawEvidence(raw, claims) {
  assert.ok(claims.length > 0, "the fixture must produce at least one claim");
  for (const claim of claims) {
    const span = claim.evidenceSpan;
    assert.ok(span && Number.isInteger(span.start) && Number.isInteger(span.end), claim.predicate);
    assert.equal(raw.slice(span.start, span.end), span.textSpan, claim.predicate);
  }
}

test("evidence offsets remain sliceable after masking, trimming and Unicode edge cases", () => {
  const cases = [
    "  Ismételt cím 4 millió forintról\n\nIsmételt cím 4 millió forintról\nFotó: Szerkesztőség\nZách Dániel\nA vonat 120 kilométert tett meg.",
    "\u00a0Cím\n\nA vonat 120 kilométert tett meg.",
    "Cím\nA vonat 120 kilométert tett meg.",
    "Cím\nÁrvízvédelmi mérés: a létszám 120 fő volt.\n\nA vonat 95 kilométert tett meg.",
  ];
  for (const raw of cases) assertRawEvidence(raw, semantic.extractClaims(raw, "offset-fixture"));
});

test("delta changes are additive and never projected as fake absolute properties", () => {
  const cases = [
    ["A jármű 20 km-rel hosszabb volt.", "DISTANCE", 20, "km", "increase"],
    ["A hőmérséklet körülbelül 3 fokkal magasabb lett.", "TEMPERATURE", 3, "degree", "increase"],
    ["Az arány 15%-kal kisebb lett.", "PERCENT", 15, "%", "decrease"],
    ["A bevétel 200 millióval több lett.", "AMOUNT", 200000000, "HUF", "increase"],
    ["A sportoló 5 évvel idősebb lett.", "AGE", 5, "year", "increase"],
  ];
  for (const [text, property, value, unit, direction] of cases) {
    const prediction = provider.predictArticle({ source: "delta-fixture", text });
    const change = prediction.changes.find((item) => item.kind === "delta");
    assert.equal(change?.property, property, text);
    assert.equal(change?.value, value, text);
    assert.equal(change?.unit, unit, text);
    assert.equal(change?.direction, direction, text);
    assert.equal(prediction.claims.some((claim) => claim.predicate === property && claim.canonicalValue === value), false, text);
  }
  const approximate = provider.predictArticle({ source: "delta-fixture", text: "A futásteljesítmény körülbelül 75 ezer kilométerrel magasabb volt." }).changes[0];
  assert.equal(approximate?.approximate, true);
  assert.equal(approximate?.changeKind, "delta");
  assert.equal(approximate?.direction, "increase");
});

test("general scalar changes preserve from/to, unit, direction, time and evidence", () => {
  const cases = [
    ["2020 júniusában a számláló 168 ezerről 247 ezer kilométer közelébe ugrott.", "DISTANCE", 168000, 247000, "km", "increase"],
    ["Az ár 500-ról 620 forintra nőtt.", "AMOUNT", 500, 620, "HUF", "increase"],
    ["A munkanélküliség 4,2%-ról 4,8%-ra emelkedett.", "PERCENT", 4.2, 4.8, "%", "increase"],
    ["A hőmérséklet 18-ról 12 fokra csökkent.", "TEMPERATURE", 18, 12, "degree", "decrease"],
    ["A létszám 120-ról 95 főre esett.", "HEADCOUNT", 120, 95, "person", "decrease"],
    ["A sebesség 80-ról 50 km/h-ra csökkent.", "SPEED", 80, 50, "km/h", "decrease"],
  ];
  for (const [text, property, from, to, unit, direction] of cases) {
    const prediction = provider.predictArticle({ source: "from-to-fixture", text });
    const change = prediction.changes.find((item) => item.kind === "change");
    assert.equal(change?.property, property, text);
    assert.equal(change?.from, from, text);
    assert.equal(change?.to, to, text);
    assert.equal(change?.unit, unit, text);
    assert.equal(change?.direction, direction, text);
    assert.ok(change?.evidence && text.slice(change.evidence.start, change.evidence.end) === change.evidence.textSpan, text);
    assert.equal(prediction.conflicts.length, 0, text);
  }
});
