const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");

test("444 RSS short-content marker is preserved by the scraper", async () => {
  const { scrapeArticle } = require(path.join(root, "pipeline", "scrapeArticle.js"));
  const result = await scrapeArticle(123, "https://444.hu/2026/01/01/example", null, { persist: false });
  assert.deepEqual(result, { ok: true, skipped: true, reason: "rss_content_used" });
});

test("canonical pipeline does not fail the explicit RSS-content skip", () => {
  const source = fs.readFileSync(path.join(root, "pipeline", "cron.js"), "utf8");
  assert.match(
    source,
    /if \(scrapeRes\.skipped\) \{[\s\S]*?if \(scrapeRes\.reason !== "rss_content_used"\)[\s\S]*?throw new Error\(`article_skipped:/,
  );
});
