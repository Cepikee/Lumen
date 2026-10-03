const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

for (const file of ["HiradoArchive.tsx", "HiradoArchiveSlider.tsx"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "components", file), "utf8");
  assert.match(source, /const controller = new AbortController\(\)/, file);
  assert.match(source, /signal: controller\.signal/, file);
  assert.match(source, /if \(\(error as Error\)\?\.name !== "AbortError"\)/, file);
  assert.match(source, /return \(\) => controller\.abort\(\)/, file);
}

console.log("hirado archive fetch cancellation regression: PASS");
