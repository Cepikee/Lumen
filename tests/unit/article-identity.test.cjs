"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalizeArticleUrl } = require("../../lib/article-identity");

test("feed URL identity removes transport and tracking differences deterministically", () => {
  const a = canonicalizeArticleUrl("http://WWW.Example.com/news/item/?utm_source=rss&b=2&a=1#top");
  const b = canonicalizeArticleUrl("https://example.com/news/item?a=1&b=2");
  assert.equal(a, b);
});

test("feed URL identity rejects non-http URLs", () => {
  assert.equal(canonicalizeArticleUrl("javascript:alert(1)"), null);
  assert.equal(canonicalizeArticleUrl("not a url"), null);
});

test("distinct real articles are not merged by equal titles", () => {
  const first = canonicalizeArticleUrl("https://example.com/news/first");
  const second = canonicalizeArticleUrl("https://example.com/news/second");
  assert.notEqual(first, second);
});

test("sequential and concurrent feed delivery retain one canonical identity", async () => {
  const stored = new Set();
  const insert = async (url) => {
    await Promise.resolve();
    stored.add(canonicalizeArticleUrl(url));
  };
  await insert("https://example.com/item/?utm_source=feed");
  await insert("http://www.example.com/item");
  await Promise.all([
    insert("https://example.com/item#fragment"),
    insert("https://example.com/item/?fbclid=tracking"),
  ]);
  assert.deepEqual([...stored], ["https://example.com/item"]);
});

test("canonical URL normalization is idempotent and preserves meaningful query parameters", () => {
  const canonical = canonicalizeArticleUrl("HTTP://WWW.Example.COM//News/%7eitem/?lang=hu&id=7&utm_medium=rss&fbclid=x#part");
  assert.equal(canonical, "https://example.com/News/~item?id=7&lang=hu");
  assert.equal(canonicalizeArticleUrl(canonical), canonical);
  assert.notEqual(
    canonicalizeArticleUrl("https://example.com/story?id=1"),
    canonicalizeArticleUrl("https://example.com/story?id=2"),
  );
});

test("generic ref and source parameters remain part of article identity", () => {
  assert.equal(canonicalizeArticleUrl("https://example.com/story?ref=edition&source=wire"), "https://example.com/story?ref=edition&source=wire");
});
