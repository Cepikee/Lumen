"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { formatPredicate, formatStatus, formatEntityType, formatTypedValue } = require("../../lib/v22/presentation.cjs");

test("owner presentation maps canonical enums and typed values", () => {
  assert.equal(formatPredicate("works_for"), "ennél a szervezetnél dolgozik");
  assert.equal(formatStatus("accepted"), "azonosítva");
  assert.equal(formatEntityType("organization"), "szervezet");
  assert.equal(formatTypedValue({ value: 12, unit: "million HUF" }), "12 million HUF");
  assert.equal(formatTypedValue({ nested_value: 1 }), "nested value: 1");
  assert.doesNotMatch(formatTypedValue({ nested_value: 1 }), /\[object Object\]/);
});

test("showcase owner mode routes canonical fields through central presentation mapping", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../components/V2DemoShowcase.tsx"), "utf8");
  assert.match(source, /from ["']@\/lib\/v22\/presentation\.cjs["']/);
  assert.match(source, /formatPredicate\(relation\.predicate\)/);
  assert.match(source, /formatStatus\(entity\.status\)/);
  assert.match(source, /formatTypedValue\(relation\.object\)/);
});

test("demo read model preserves structured values for the owner formatter", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../app/api/dev/v2-demo/route.ts"), "utf8");
  assert.match(source, /function preserveTypedValue/);
  assert.match(source, /normalizedValue \?\? row\.valueJson/);
  assert.doesNotMatch(source, /String\(claim\.normalizedValue \|\| claim\.valueJson/);
});

test("showcase exposes the required benchmark scenario selector", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../components/V2DemoShowcase.tsx"), "utf8");
  for (const option of ["numeric-conflict", "semantic-non-conflict", "unit-conversion", "negation", "conditional", "attribution", "namesake", "temporal-change", "source-omission", "multi-event"]) assert.match(source, new RegExp(option));
  assert.match(source, /Showcase scenario/);
  assert.match(source, /Ehhez a kiválasztott scenariohoz/);
});
