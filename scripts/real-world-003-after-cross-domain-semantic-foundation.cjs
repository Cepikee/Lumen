"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const provider = require("../lib/v22/deterministic-text-provider.cjs");

const repoRoot = path.resolve(__dirname, "..");
const dir = path.join(repoRoot, "docs", "UTOM_V2_2", "real_world");
const inputPath = path.join(dir, "003_source_article.txt");
const firstPassPath = path.join(dir, "003_first_pass_raw.json");
const outputPath = path.join(dir, "003_after_cross_domain_semantic_foundation.json");
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
if (fs.existsSync(outputPath)) throw new Error("real_world_003_after_already_exists");
const text = fs.readFileSync(inputPath, "utf8");
const firstPass = JSON.parse(fs.readFileSync(firstPassPath, "utf8"));
const title = text.split(/\r?\n/).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_003";
const prediction = provider.predictArticle({
  source: { key: "real-world-003", label: "REAL_WORLD_ARTICLE_003" },
  title,
  text,
  url: "https://local.invalid/real-world-003"
});

const evidenceChecks = [];
const check = (kind, item, span) => {
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
    evidenceChecks.push({ kind, ok: false, reason: "missing_or_invalid_evidence_span" });
    return;
  }
  const actual = text.slice(span.start, span.end);
  evidenceChecks.push({ kind, start: span.start, end: span.end, expected: span.textSpan, actual, ok: actual === span.textSpan });
};
for (const claim of Array.isArray(prediction.claims) ? prediction.claims : []) check("claim", claim, claim?.evidenceSpan);
for (const change of Array.isArray(prediction.changes) ? prediction.changes : []) check("change", change, change?.evidence);
for (const frame of Array.isArray(prediction.semanticFrames) ? prediction.semanticFrames : []) check("semantic-frame", frame, frame?.evidenceSpan);
const evidenceAudit = {
  totalEvidenceSpans: evidenceChecks.length,
  exactRawOffsetMatches: evidenceChecks.filter((item) => item.ok).length,
  failures: evidenceChecks.filter((item) => !item.ok).length,
  checks: evidenceChecks
};
const result = {
  testId: "REAL_WORLD_ARTICLE_003",
  pass: "after-cross-domain-semantic-foundation",
  generatedAt: new Date().toISOString(),
  input: { path: "docs/UTOM_V2_2/real_world/003_source_article.txt", sha256: sha256(text), sourceKey: "real-world-003", title },
  firstPassRawSha256: sha256(fs.readFileSync(firstPassPath)),
  evidenceAudit,
  prediction
};
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({ outputPath, counts: {
  entities: prediction.entities.length,
  numericMentions: prediction.numericMentions.length,
  claims: prediction.claims.length,
  relations: prediction.relations.length,
  events: prediction.events.length,
  changes: prediction.changes.length,
  conflicts: prediction.conflicts.length,
  semanticFrames: prediction.semanticFrames.length,
  evidence: evidenceAudit
} }, null, 2));
