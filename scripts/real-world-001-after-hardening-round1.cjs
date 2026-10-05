"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const provider = require("../lib/v22/deterministic-text-provider.cjs");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "docs", "UTOM_V2_2", "real_world");
const inputPath = path.join(dir, "001_source_article.txt");
const freezePath = path.join(dir, "001_state_freeze.json");
const beforePath = path.join(dir, "001_first_pass_raw.json");
const outputPath = path.join(dir, "001_after_hardening_round1.json");
const text = fs.readFileSync(inputPath, "utf8");
const freeze = JSON.parse(fs.readFileSync(freezePath, "utf8"));
const beforeBytes = fs.readFileSync(beforePath);
const sourceSha256 = crypto.createHash("sha256").update(text, "utf8").digest("hex").toUpperCase();
if (sourceSha256 !== freeze.sourceArticleSha256) throw new Error("real_world_001_source_changed");
const prediction = provider.predictArticle({ source: { key: "real-world-001", label: "REAL_WORLD_ARTICLE_001" }, title: text.split(/\r?\n/).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_001", text, url: "https://local.invalid/real-world-001" });
const result = {
  testId: "REAL_WORLD_ARTICLE_001",
  pass: "after-hardening-round-1",
  generatedAt: new Date().toISOString(),
  input: { path: "docs/UTOM_V2_2/real_world/001_source_article.txt", sha256: sourceSha256 },
  beforeFirstPassSha256: crypto.createHash("sha256").update(beforeBytes).digest("hex").toUpperCase(),
  prediction,
};
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({ outputPath, prediction }, null, 2));
