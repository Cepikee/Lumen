"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const provider = require("../lib/v22/deterministic-text-provider.cjs");

const repoRoot = path.resolve(__dirname, "..");
const dir = path.join(repoRoot, "docs", "UTOM_V2_2", "real_world");
const inputPath = path.join(dir, "002_source_article.txt");
const freezePath = path.join(dir, "002_state_freeze.json");
const outputPath = path.join(dir, "002_first_pass_raw.json");
const freeze = JSON.parse(fs.readFileSync(freezePath, "utf8"));
const text = fs.readFileSync(inputPath, "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
const sourceSha256 = sha256(text);
if (sourceSha256 !== freeze.source.sha256) throw new Error("real_world_002_source_changed");
if (freeze.localHead !== "d145120c6e044b4f25d1d7b94e87846652ef80ba") throw new Error("unexpected_checkpoint");
if (childProcess.execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim() !== freeze.localHead) throw new Error("working_head_changed");
if (fs.existsSync(outputPath)) throw new Error("real_world_002_first_pass_already_exists");

const title = text.split(/\r?\n/).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_002";
const prediction = provider.predictArticle({
  source: { key: "real-world-002", label: "REAL_WORLD_ARTICLE_002" },
  title,
  text,
  url: "https://local.invalid/real-world-002"
});

const evidenceChecks = [];
for (const claim of Array.isArray(prediction.claims) ? prediction.claims : []) {
  const span = claim?.evidenceSpan;
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
    evidenceChecks.push({ kind: "claim", ok: false, reason: "missing_or_invalid_evidence_span" });
    continue;
  }
  const actual = text.slice(span.start, span.end);
  evidenceChecks.push({ kind: "claim", start: span.start, end: span.end, expected: span.textSpan, actual, ok: actual === span.textSpan });
}
for (const change of Array.isArray(prediction.changes) ? prediction.changes : []) {
  const span = change?.evidence;
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
    evidenceChecks.push({ kind: "change", ok: false, reason: "missing_or_invalid_evidence_span" });
    continue;
  }
  const actual = text.slice(span.start, span.end);
  evidenceChecks.push({ kind: "change", start: span.start, end: span.end, expected: span.textSpan, actual, ok: actual === span.textSpan });
}
const evidenceAudit = {
  totalEvidenceSpans: evidenceChecks.length,
  exactRawOffsetMatches: evidenceChecks.filter((check) => check.ok).length,
  failures: evidenceChecks.filter((check) => !check.ok).length,
  checks: evidenceChecks
};
const result = {
  testId: "REAL_WORLD_ARTICLE_002",
  pass: "first-blind-pass",
  generatedAt: new Date().toISOString(),
  immutableCheckpoint: freeze.localHead,
  input: {
    path: "docs/UTOM_V2_2/real_world/002_source_article.txt",
    sha256: sourceSha256,
    sourceKey: "real-world-002",
    title
  },
  evidenceAudit,
  prediction
};
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({ outputPath, sha256: sourceSha256, counts: {
  entities: prediction.entities.length,
  numericMentions: prediction.numericMentions.length,
  claims: prediction.claims.length,
  relations: prediction.relations.length,
  events: prediction.events.length,
  changes: prediction.changes.length,
  conflicts: prediction.conflicts.length,
  evidence: evidenceAudit
} }, null, 2));
