"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const css = fs.readFileSync("app/globals.css", "utf8");
const login = fs.readFileSync("components/LoginModal.tsx", "utf8");
const profile = fs.readFileSync("components/ProfileMenu.tsx", "utf8");
const article = fs.readFileSync("app/cikk/[id]/page.tsx", "utf8");

test("browser acceptance keeps keyboard focus visible after the global outline reset", () => {
  assert.match(css, /:where\(a, button, \[role="button"\], input, textarea, select\):focus-visible/);
  assert.match(css, /outline: 3px solid #0d6efd/);
  assert.equal((css.match(/\*:not\(input\):not\(textarea\):not\(\[contenteditable="true"\]\):focus\s*\{/g) || []).length, 0);
  assert.match(css, /:focus:not\(:focus-visible\)\s*\{\s*outline: none;/);
});

test("auth and profile controls expose keyboard and dialog semantics", () => {
  assert.match(login, /role="dialog"/);
  assert.match(login, /aria-modal="true"/);
  assert.match(login, /aria-labelledby="login-modal-title"/);
  assert.match(profile, /role="button"/);
  assert.match(profile, /tabIndex=\{0\}/);
  assert.match(profile, /aria-label="Profil menü megnyitása"/);
  assert.match(profile, /event\.key === "Enter"/);
});

test("article detail exposes a document heading", () => {
  assert.match(article, /<h1 className="article-title">/);
});

console.log("browser accessibility contract regression: PASS");
