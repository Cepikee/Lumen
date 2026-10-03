"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { isFrontendV2Enabled } = require("../../lib/v2/frontend-config");

test("M14 frontend flag uses explicit safe boolean semantics", () => {
  for (const value of [undefined, null, "", "false", "0", "off", "malformed", " FALSE "]) {
    assert.equal(isFrontendV2Enabled(value), false, String(value));
  }
  for (const value of ["true", "1", "yes", "on", " TRUE "]) {
    assert.equal(isFrontendV2Enabled(value), true, String(value));
  }
});

console.log("M14 frontend config regression: PASS");
