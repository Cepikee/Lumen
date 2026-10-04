"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const test = require("node:test");

test("V2 article context exposes stored claims/timeline and accepted organisation entities", () => {
  const route = fs.readFileSync("app/api/v2/articles/[id]/context/route.ts", "utf8");
  const repository = fs.readFileSync("lib/v2/read-model-repository.js", "utf8");
  assert.match(route, /SELECT DISTINCT id FROM v2_claims WHERE article_id/);
  assert.match(route, /readTimelineItems/);
  assert.match(route, /partial: false/);
  assert.match(route, /'active','accepted','review','disputed'/);
  assert.match(repository, /organisation/);
  assert.match(repository, /status IN \('active','accepted','review','disputed'\)/);
});

console.log("V2 article intelligence trace contract regression: PASS");
