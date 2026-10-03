const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("trend source modal ignores stale responses and malformed payloads", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "components", "TrendsPanel.tsx"), "utf8");
  assert.match(source, /sourcesRequestRef\s*=\s*useRef\(0\)/);
  assert.match(source, /requestId !== sourcesRequestRef\.current/);
  assert.match(source, /if \(!res\.ok\) throw new Error/);
  assert.match(source, /Array\.isArray\(data\)/);
});
