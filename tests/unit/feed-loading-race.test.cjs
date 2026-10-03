const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("feed loading cleanup is guarded by the active request sequence", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "app", "page.tsx"), "utf8");
  assert.match(source, /feedRequestRef\s*=\s*useRef\(0\)/);
  assert.match(source, /const requestId = \+\+feedRequestRef\.current/);
  assert.match(source, /requestId === undefined \|\| requestId === feedRequestRef\.current/);
});
