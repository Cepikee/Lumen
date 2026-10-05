"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const provider = require("../lib/v22/deterministic-text-provider.cjs");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "docs", "UTOM_V2_2", "real_world");
const read = (name, encoding) => fs.readFileSync(path.join(dir, name), encoding);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
const source = read("001_source_article.txt", "utf8");
const freeze = JSON.parse(read("001_round2_state_freeze.json", "utf8"));
const firstPass = read("001_first_pass_raw.json");
const round1 = read("001_after_hardening_round1.json");
if (sha256(source) !== freeze.sourceSha256) throw new Error("real_world_001_source_changed");
if (sha256(firstPass) !== freeze.firstPassSha256) throw new Error("real_world_001_first_pass_changed");
if (sha256(round1) !== freeze.round1AfterSha256) throw new Error("real_world_001_round1_after_changed");
const prediction = provider.predictArticle({
  source: { key: "real-world-001", label: "REAL_WORLD_ARTICLE_001" },
  title: source.split(/\r?\n/u).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_001",
  text: source,
  url: "https://local.invalid/real-world-001",
});
const result = {
  testId: "REAL_WORLD_ARTICLE_001",
  pass: "after-hardening-round-2",
  generatedAt: new Date().toISOString(),
  input: { path: "docs/UTOM_V2_2/real_world/001_source_article.txt", sha256: sha256(source) },
  beforeFirstPassSha256: sha256(firstPass),
  beforeRound1AfterSha256: sha256(round1),
  prediction,
};
const outputPath = path.join(dir, "001_after_hardening_round2.json");
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({ outputPath, counts: {
  entities: prediction.entities.length,
  relations: prediction.relations.length,
  claims: prediction.claims.length,
  numericMentions: prediction.numericMentions.length,
  events: prediction.events.length,
}, }, null, 2));
