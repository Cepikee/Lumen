"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const route = fs.readFileSync("app/api/related/route.ts", "utf8");
const page = fs.readFileSync("app/cikk/[id]/page.tsx", "utf8");

test("related API keeps only the newest summary per article", () => {
  assert.match(route, /NOT EXISTS\s*\(\s*SELECT 1\s+FROM summaries newer_s/);
  assert.match(route, /newer_s\.created_at > s\.created_at/);
  assert.match(route, /newer_s\.id > s\.id/);
});

test("related API excludes articles belonging to disabled canonical sources", () => {
  assert.match(route, /AND \(src\.id IS NULL OR src\.is_active = 1\)/);
});

test("article detail validates IDs and HTTP response before rendering", () => {
  assert.ok(page.includes("if (!/^\\d+$/.test(id)"));
  assert.match(page, /if \(!res\.ok\) throw new Error\(`article_http_/);
});

test("article detail cannot leave related loading stuck on missing item or source", () => {
  assert.match(page, /if \(!item \|\| !Number\.isSafeInteger\(Number\(item\.id\)\)\) \{/);
  assert.match(page, /if \(!normalized \|\| normalized === "ismeretlen"\) \{[\s\S]*setRelatedLoading\(false\)/);
  assert.match(page, /if \(!res\.ok\) throw new Error\(`related_http_/);
});

test("article detail guards nullable render fields", () => {
  assert.match(page, /Array\.isArray\(item\.keywords\)/);
  assert.match(page, /Number\.isNaN\(parsed\.getTime\(\)\)/);
  assert.match(page, /typeof item\.title === "string"/);
});

test("article detail deduplicates and excludes self-referential related rows", () => {
  assert.match(page, /const seen = new Set<number>\(\)/);
  assert.match(page, /candidateId === Number\(item\.id\) \|\| seen\.has\(candidateId\)/);
});

test("article detail uses the joined source consistently for related request and badge", () => {
  assert.match(page, /const rawSource = item\.source_name \|\| item\.source \|\| \"\"/);
  assert.match(page, /const rawSource = item\.source_name \?\? item\.source \?\? \"\"/);
});
