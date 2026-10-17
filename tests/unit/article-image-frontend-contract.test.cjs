"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("summary API exposes only ready image paths joined by article id", () => {
  const route = fs.readFileSync("app/api/summaries/route.ts", "utf8");
  assert.match(route, /LEFT JOIN article_images ai\s+ON ai\.article_id = a\.id/g);
  assert.match(route, /ai\.image_status = 'ready'/);
  assert.match(route, /ai\.storage_path REGEXP/g);
  assert.match(route, /CONCAT\('\/article-images\/', ai\.storage_path\)/);
  assert.match(route, /jpg\|jpeg\|png\|webp/);
});

test("feed and detail render stable 16:9 fallbacks and disclose generated images", () => {
  const card = fs.readFileSync("components/FeedItemCard.tsx", "utf8");
  const css = fs.readFileSync("components/NewsFeedCard.module.css", "utf8");
  const detail = fs.readFileSync("app/cikk/[id]/page.tsx", "utf8");
  assert.match(card, /width=\{1024\} height=\{576\}/);
  assert.match(card, /onError=\{\(\)=>setImageFailed\(true\)\}/);
  assert.match(card, /AI illusztráció/);
  assert.match(css, /aspect-ratio:16\/9/);
  assert.match(detail, /safeArticleImage/);
  assert.match(detail, /\[a-f0-9\]\{12\}/);
  for (const extension of ["jpg", "jpeg", "png", "webp"]) {
    assert.ok(card.includes("jpe?g|png|webp"), `${extension} must be accepted by feed path validation`);
    assert.ok(detail.includes("jpe?g|png|webp"), `${extension} must be accepted by detail path validation`);
  }
  assert.doesNotMatch(card, /article-images.*[A-Z]:/);
  assert.match(detail, /AI illusztráció/);
  const config = fs.readFileSync("next.config.ts", "utf8");
  assert.match(config, /article-images.*jpe\?g\|png\|webp/);
  assert.match(config, /max-age=31536000, immutable/);
});
