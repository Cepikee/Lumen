const assert = require("node:assert/strict");
const fs = require("node:fs");

for (const file of [
  "components/WhatHappenedTodayKulcsszavak.tsx",
  "components/WhatHappenedTodaySourceActivity.tsx",
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /const escapeTooltipText = \(value: string\)/, `${file} must escape API labels`);
  assert.ok(source.includes('value.replace(/[&<>"\']'), `${file} must escape HTML metacharacters`);
  assert.match(source, /escapeTooltipText\(label\)/, `${file} tooltip must use escaped label`);
}

console.log("premium tooltip API-label escaping regression: PASS");
