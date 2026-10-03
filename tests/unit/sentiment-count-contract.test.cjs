const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");

test("sentiment today adds numeric DB counts instead of concatenating strings", () => {
  const source = fs.readFileSync(path.join(root, "app/api/insights/sentiment/today/route.ts"), "utf8");
  assert.match(source, /const count = Number\(r\.c\)/);
  assert.match(source, /positive \+= count/);
  assert.match(source, /neutral \+= count/);
  assert.match(source, /negative \+= count/);
});

test("sentiment by category normalizes grouping and numeric counts", () => {
  const source = fs.readFileSync(path.join(root, "app/api/insights/sentiment/by-category/route.ts"), "utf8");
  assert.match(source, /GROUP BY LOWER\(TRIM\(category\)\), sentiment/);
  assert.match(source, /MIN\(TRIM\(category\)\) AS category/);
  assert.match(source, /const count = Number\(r\.c\)/);
  assert.match(source, /positive \+= count/);
});

test("source category UI excludes both portfolio source spellings", () => {
  const source = fs.readFileSync(path.join(root, "components/WSourceCategoryDistribution.tsx"), "utf8");
  assert.match(source, /source !== "portfolio" && source !== "portfolio\.hu"/);
});
