"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const provider = require("../lib/v22/deterministic-text-provider.cjs");

const repoRoot = path.resolve(__dirname, "..");
const inputPath = path.join(repoRoot, "docs", "UTOM_V2_2", "real_world", "001_source_article.txt");
const outputPath = path.join(repoRoot, "docs", "UTOM_V2_2", "real_world", "001_first_pass_raw.json");
const text = fs.readFileSync(inputPath, "utf8");
const title = text.split(/\r?\n/).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_001";
const prediction = provider.predictArticle({
  source: { key: "real-world-001", label: "REAL_WORLD_ARTICLE_001" },
  title,
  text,
  url: "https://local.invalid/real-world-001"
});

const result = {
  testId: "REAL_WORLD_ARTICLE_001",
  pass: "first-blind-pass",
  generatedAt: new Date().toISOString(),
  input: {
    path: "docs/UTOM_V2_2/real_world/001_source_article.txt",
    sha256: crypto.createHash("sha256").update(text, "utf8").digest("hex").toUpperCase(),
    sourceKey: "real-world-001",
    title
  },
  prediction
};

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({ outputPath, sha256: result.input.sha256, prediction }, null, 2));
