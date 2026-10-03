"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { REPOSITORY_CONTRACT } = require("../../lib/v2/repository-contract");

const root = path.resolve(__dirname, "../..");
const v2Root = path.join(root, "lib", "v2");
const extensions = [".js", ".cjs", ".mjs", ".ts", ".tsx"];
const importPattern = /(?:from\s+|require\s*\(|import\s*\()["']([^"']+)["']/g;

function runtimeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return runtimeFiles(full);
    return extensions.includes(path.extname(entry.name)) ? [full] : [];
  });
}

function resolveLocal(from, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), specifier);
  for (const candidate of [base, ...extensions.map((ext) => base + ext), ...extensions.map((ext) => path.join(base, `index${ext}`))]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

test("repository contract freezes the M1.6 server boundary", () => {
  assert.equal(REPOSITORY_CONTRACT.version, "v2.repository.1");
  assert.equal(REPOSITORY_CONTRACT.boundary, "server-only");
  assert.equal(REPOSITORY_CONTRACT.input, "normalized-record");
  assert.equal(REPOSITORY_CONTRACT.output, "normalized-record");
  assert.deepEqual(REPOSITORY_CONTRACT.transaction, {
    ownership: "caller",
    commit: "caller",
    rollback: "caller",
    release: "caller",
  });
  assert.deepEqual(REPOSITORY_CONTRACT.scopes, [
    "entities", "aliases", "mentions", "relations", "evidence",
    "claims", "events", "aiRuns", "processingState",
    "ingestionProvenance", "conflicts", "confidenceHistory", "aiDecisions",
  ]);
  assert.deepEqual(REPOSITORY_CONTRACT.errors, ["validation", "not_found", "conflict", "database"]);
  assert.equal(Object.isFrozen(REPOSITORY_CONTRACT), true);
  assert.equal(Object.isFrozen(REPOSITORY_CONTRACT.transaction), true);
  assert.equal(Object.isFrozen(REPOSITORY_CONTRACT.scopes), true);
  assert.equal(Object.isFrozen(REPOSITORY_CONTRACT.errors), true);
});

test("V2 runtime graph has no fixture/test reverse dependency or cycle", () => {
  const files = runtimeFiles(v2Root);
  const graph = new Map(files.map((file) => [file, []]));
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const dependency = resolveLocal(file, match[1]);
      if (!dependency) continue;
      assert.equal(dependency.startsWith(path.join(root, "tests")), false, `${file} imports tests`);
      assert.equal(dependency.startsWith(path.join(root, "app")), false, `${file} imports app`);
      if (graph.has(dependency)) graph.get(file).push(dependency);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(file) {
    if (visiting.has(file)) throw new Error(`V2 dependency cycle at ${path.relative(root, file)}`);
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file) || []) visit(dependency);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of files) visit(file);
  assert.equal(visited.size, files.length);
});

test("V2 runtime modules are importable without DB, network or timer side effects", () => {
  const before = new Set(process.getActiveResourcesInfo?.() || []);
  for (const file of runtimeFiles(v2Root)) {
    const source = fs.readFileSync(file, "utf8");
    if (!file.endsWith("ingestion-provenance-repository.js") && !file.endsWith("entity-extraction-repository.js") && !file.endsWith("entity-resolution-repository.js") && !file.endsWith("relation-extraction-repository.js") && !file.endsWith("claim-extraction-repository.js") && !file.endsWith("event-matching-repository.js") && !file.endsWith("temporal-graph-repository.js") && !file.endsWith("conflict-history-repository.js") && !file.endsWith("ai-cost-router-repository.js")) {
      assert.doesNotMatch(source, /(?:createPool|createConnection|\.query\s*\(|\.execute\s*\(|fetch\s*\(|setTimeout\s*\(|setInterval\s*\()/, path.relative(root, file));
    }
    require(file);
  }
  const after = new Set(process.getActiveResourcesInfo?.() || []);
  assert.deepEqual([...after].sort(), [...before].sort());
});

console.log("M1.6 V2 repository/import contract: PASS");
