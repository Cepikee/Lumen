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
const freeze = JSON.parse(read("001_round2_2_state_freeze.json", "utf8"));
const firstPass = read("001_first_pass_raw.json");
const round1 = read("001_after_hardening_round1.json");
const round2 = read("001_after_hardening_round2.json");
const round2_1 = read("001_after_round2_1_safety_closure.json");
const outputName = "001_after_round2_2_evidence_temporal_closure.json";
if (fs.existsSync(path.join(dir, outputName))) throw new Error("round2_2_output_already_exists");
const immutable = freeze.immutableArtifactSha256;
if (sha256(source) !== immutable["source article"]) throw new Error("real_world_001_source_changed");
if (sha256(firstPass) !== immutable["first pass"]) throw new Error("real_world_001_first_pass_changed");
if (sha256(round1) !== immutable["round1 after"]) throw new Error("real_world_001_round1_after_changed");
if (sha256(round2) !== immutable["round2 after"]) throw new Error("real_world_001_round2_after_changed");
if (sha256(round2_1) !== immutable["round2.1 after"]) throw new Error("real_world_001_round2_1_after_changed");

const prediction = provider.predictArticle({
  source: { key: "real-world-001", label: "REAL_WORLD_ARTICLE_001" },
  title: source.split(/\r?\n/u).find((line) => line.trim()) || "REAL_WORLD_ARTICLE_001",
  text: source,
  url: "https://local.invalid/real-world-001",
});
for (const claim of prediction.claims) {
  const span = claim.evidenceSpan;
  if (!span || source.slice(span.start, span.end) !== span.textSpan) throw new Error(`raw_evidence_offset_mismatch:${claim.predicate}`);
}
for (const change of prediction.changes) {
  const span = change.evidence;
  if (!span || source.slice(span.start, span.end) !== span.textSpan) throw new Error(`raw_change_offset_mismatch:${change.property}`);
}
const result = {
  testId: "REAL_WORLD_ARTICLE_001",
  pass: "after-round-2-2-evidence-temporal-closure",
  generatedAt: new Date().toISOString(),
  input: { path: "docs/UTOM_V2_2/real_world/001_source_article.txt", sha256: sha256(source) },
  immutableInputs: {
    firstPassSha256: sha256(firstPass),
    round1AfterSha256: sha256(round1),
    round2AfterSha256: sha256(round2),
    round2_1AfterSha256: sha256(round2_1),
  },
  prediction,
};
fs.writeFileSync(path.join(dir, outputName), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({ outputPath: path.join(dir, outputName), counts: {
  entities: prediction.entities.length,
  relations: prediction.relations.length,
  claims: prediction.claims.length,
  numericMentions: prediction.numericMentions.length,
  events: prediction.events.length,
  changes: prediction.changes.length,
}, }, null, 2));
