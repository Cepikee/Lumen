"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const semantic = require("../../lib/v2/deterministic-semantic");
const provider = require("../../lib/v22/deterministic-text-provider.cjs");

test("legal proceeding is a generic frame, never a project-start claim", () => {
  const text = "Kovács Anna ellen márciusban korrupció gyanúja miatt vizsgálat indult.";
  const claims = semantic.extractClaims(text, "legal.example");
  const frames = semantic.extractSemanticFrames(text, semantic.extractEntities(text));
  assert.equal(claims.some((claim) => claim.predicate === "PROJECT_START"), false);
  assert.ok(frames.some((frame) => frame.action === "legal/investigation" && frame.target?.mention === "Kovács Anna"));
});

test("media context and person/location boundaries are typed without name-specific rules", () => {
  const text = "A Hírügynökség szerint Nagy Bence Tiszavárosban nyilatkozott.";
  const entities = semantic.extractEntities(text);
  assert.ok(entities.some((entity) => entity.normalized === "hírügynökség" && entity.type === "organization" && entity.identity === "same" && entity.sourceRole === "media_source"));
  assert.ok(entities.some((entity) => entity.normalized === "nagy bence" && entity.type === "person"));
  assert.ok(entities.some((entity) => entity.normalized === "tiszaváros" && entity.type === "location"));
  assert.equal(entities.some((entity) => /nagy bence tiszaváros/iu.test(entity.normalized)), false);
});

test("numeric arguments bind separately to nearby subjects and classify local semantics", () => {
  const text = "Nagy Bence 52,4 százalékot, míg Szabó Éva 41,2 százalékot szerzett.";
  const entities = semantic.extractEntities(text);
  const frames = semantic.extractSemanticFrames(text, entities).filter((item) => item.action === "election/result");
  assert.equal(frames.length, 2);
  assert.deepEqual(frames.flatMap((frame) => frame.numericArguments.map((item) => [item.canonicalValue, item.subject?.mention, item.semanticKind])), [
    [52.4, "Nagy Bence", "percentage"],
    [41.2, "Szabó Éva", "percentage"],
  ]);
  assert.ok(frames.every((frame) => frame.numericArguments.every((item) => item.subject?.normalized === frame.subject?.normalized)));
});

test("admission, denial and conditional promise remain separate frames", () => {
  const text = "Ha megválasztják, Nagy Bence kegyelmet adna apjának. Barta elismerte A-t, de tagadta B-t.";
  const frames = semantic.extractSemanticFrames(text, semantic.extractEntities(text));
  assert.ok(frames.some((frame) => frame.action === "promise/plan" && frame.conditionality === true && frame.status === "conditional"));
  assert.ok(frames.some((frame) => frame.action === "admission"));
  assert.ok(frames.some((frame) => frame.action === "denial"));
});

test("historical judgment reference does not become a new court event", () => {
  const prediction = provider.predictArticle({ source: "legal.example", text: "A bíróság korábbi ítéletét a felek csak hivatkozásként említették." });
  assert.equal(prediction.events.some((event) => event.title === "Bírósági döntés"), false);
});
