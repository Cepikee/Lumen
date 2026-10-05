"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { extractClaims, predictArticle } = require("../../lib/v22/deterministic-text-provider.cjs");

test("deterministic provider extracts only text-grounded numeric and semantic markers", () => {
  const article = { source: { key: "example.hu" }, text: "A beruházás költsége 12 millió forint. Ha elkészül az engedély, júniusban indulhat. A közlemény szerint nem történt sérülés." };
  const claims = extractClaims(article);
  assert.ok(claims.some((claim) => claim.value === 12 && claim.unit === "million HUF"));
  assert.ok(claims.some((claim) => claim.conditional === true));
  assert.ok(claims.some((claim) => claim.polarity === "negated"));
  assert.ok(claims.every((claim) => claim.evidence && article.text.includes(claim.evidence)));
  assert.deepEqual(predictArticle(article).relations, []);
});

test("deterministic provider does not import or read gold/scenario logic", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../lib/v22/deterministic-text-provider.cjs"), "utf8");
  assert.doesNotMatch(source, /gold-manifest|benchmark-dataset|V22-S\d|INSERT\s+INTO/i);
});
