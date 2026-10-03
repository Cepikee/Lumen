"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("components/HiradoArchiveSlider.tsx", "utf8");

assert.match(source, /function safeThumbnailUrl\(value: unknown\): string/);
assert.match(source, /if \(!trimmed\) return ARCHIVE_PLACEHOLDER/);
assert.ok(source.includes('trimmed.startsWith("/")'));
assert.ok(source.includes('/^https?:\\/\\//i.test(trimmed)'));
assert.match(source, /event\.currentTarget\.onerror = null/);
assert.match(source, /event\.currentTarget\.src = ARCHIVE_PLACEHOLDER/);

console.log("hirado thumbnail fallback regression: PASS");
