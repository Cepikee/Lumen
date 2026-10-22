"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { MINIMUM_NODE_VERSION, isSupportedNodeVersion, parseVersion } = require("../../lib/runtime-version.cjs");

test("security runtime gate rejects vulnerable or unsupported Node releases", () => {
  assert.equal(MINIMUM_NODE_VERSION, "24.22.1");
  for (const version of ["24.19.0", "v24.21.0", "24.22.0", "24.22.1-rc.1", "23.99.99", "25.0.0", "invalid"]) {
    assert.equal(isSupportedNodeVersion(version), false, version);
  }
  for (const version of ["24.22.1", "v24.22.2", "24.23.0"]) {
    assert.equal(isSupportedNodeVersion(version), true, version);
  }
  assert.deepEqual(parseVersion("v24.22.1"), [24, 22, 1]);
});

test("repository and active CI pin the patched Node runtime", () => {
  const root = path.join(__dirname, "../..");
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
  assert.equal(fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim(), MINIMUM_NODE_VERSION);
  assert.equal(pkg.engines.node, ">=24.22.1 <25");
  assert.equal(lock.packages[""].engines.node, pkg.engines.node);
  for (const file of ["ci.yml", "build.yml"]) {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows", file), "utf8");
    assert.match(workflow, /node-version:\s*24\.22\.1/);
  }
});
