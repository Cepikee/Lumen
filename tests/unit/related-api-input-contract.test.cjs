"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../../app/api/related/route.ts"),
  "utf8",
);

// Invalid source/article parameters must be a client error. Returning an empty
// successful list hides malformed links and makes the UI indistinguishable from
// a valid article with no related items.
assert.match(source, /invalid_related_parameters/);
assert.match(source, /status: 400/);
assert.match(source, /Number\.isSafeInteger\(excludeId\)/);

console.log("related API input contract regression: PASS");
