const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

for (const relative of [
  "app/api/insights/sentiment/today/route.ts",
  "app/api/insights/sentiment/by-category/route.ts",
]) {
  test(`${relative} uses the Budapest business-day half-open window`, () => {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert.match(source, /businessDayBounds/);
    assert.match(source, /mysqlUtc/);
    assert.match(source, /published_at\s*>?=\s*\?\s*AND\s*published_at\s*<\s*\?/);
    assert.doesNotMatch(source, /23:59:59/);
  });
}
