"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("related API accepts the canonical normalized 24.hu source key", () => {
  const route = fs.readFileSync(
    path.join(__dirname, "../../app/api/related/route.ts"),
    "utf8",
  );
  assert.match(route, /\"24\.hu\"/);
  assert.doesNotMatch(route, /const RELATED_SOURCES[\s\S]*\"24hu\"/);
});
