"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const provider = require("../lib/v22/deterministic-text-provider.cjs");

const repoRoot = path.resolve(__dirname, "..");
const dir = path.join(repoRoot, "docs", "UTOM_V2_2", "real_world");
const inputPath = path.join(dir, "003_source_article.txt");
const firstPassPath = path.join(dir, "003_first_pass_raw.json");
const foundationPath = path.join(dir, "003_after_cross_domain_semantic_foundation.json");
const outputPath = path.join(dir, "003_after_cross_domain_hardening_round2.json");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex").toUpperCase();

if (fs.existsSync(outputPath)) throw new Error("real_world_003_round2_after_already_exists");
for (const required of [inputPath, firstPassPath, foundationPath]) {
  if (!fs.existsSync(required)) throw new Error(`required_immutable_artifact_missing:${path.basename(required)}`);
}

const sourceBuffer = fs.readFileSync(inputPath);
const text = sourceBuffer.toString("utf8");
const title = text.split(/\r?\n/).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_003";
const prediction = provider.predictArticle({
  source: { key: "real-world-003", label: "REAL_WORLD_ARTICLE_003" },
  title,
  text,
  url: "https://local.invalid/real-world-003",
});

const checks = [];
function check(kind, index, span) {
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
    checks.push({ kind, index, ok: false, reason: "missing_or_invalid_evidence_span" });
    return;
  }
  const actual = text.slice(span.start, span.end);
  checks.push({ kind, index, start: span.start, end: span.end, expected: span.textSpan, actual, ok: actual === span.textSpan });
}
for (const [index, claim] of (prediction.claims || []).entries()) check("claim", index, claim?.evidenceSpan);
for (const [index, change] of (prediction.changes || []).entries()) check("change", index, change?.evidence);
for (const [index, frame] of (prediction.semanticFrames || []).entries()) check("semantic-frame", index, frame?.evidenceSpan);

const evidenceAudit = {
  totalEvidenceSpans: checks.length,
  exactRawOffsetMatches: checks.filter((item) => item.ok).length,
  failures: checks.filter((item) => !item.ok).length,
  checks,
};

const result = {
  testId: "REAL_WORLD_ARTICLE_003",
  pass: "after-cross-domain-hardening-round2",
  generatedAt: new Date().toISOString(),
  input: {
    path: "docs/UTOM_V2_2/real_world/003_source_article.txt",
    sha256: sha256(sourceBuffer),
    sourceKey: "real-world-003",
    title,
  },
  immutableArtifacts: {
    firstPassRawSha256: sha256(fs.readFileSync(firstPassPath)),
    afterFoundationSha256: sha256(fs.readFileSync(foundationPath)),
  },
  evidenceAudit,
  prediction,
};

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
process.stdout.write(`${JSON.stringify({
  outputPath,
  counts: {
    entities: prediction.entities?.length || 0,
    numericMentions: prediction.numericMentions?.length || 0,
    claims: prediction.claims?.length || 0,
    relations: prediction.relations?.length || 0,
    events: prediction.events?.length || 0,
    changes: prediction.changes?.length || 0,
    conflicts: prediction.conflicts?.length || 0,
    semanticFrames: prediction.semanticFrames?.length || 0,
  },
  evidence: {
    total: evidenceAudit.totalEvidenceSpans,
    exact: evidenceAudit.exactRawOffsetMatches,
    failures: evidenceAudit.failures,
  },
}, null, 2)}\n`);
