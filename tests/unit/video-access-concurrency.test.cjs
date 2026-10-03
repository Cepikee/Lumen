const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("first-view access is granted only when the unique view insert wins", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "api", "hirado", "can-watch", "route.ts"),
    "utf8",
  );

  assert.match(source, /const \[insertResult\] = await db\.query\(/);
  assert.match(source, /affectedRows\) !== 1/);
  assert.match(source, /reason: "PREMIUM_REQUIRED"/);
});
