"use strict";

const fs = require("node:fs");
const path = require("node:path");
const semantic = require("../../lib/v2/deterministic-semantic");

const [corpusArg, outputArg] = process.argv.slice(2);
if (!corpusArg || !outputArg) throw new Error("usage: local-nlp-baseline.cjs CORPUS OUTPUT");
const corpus = JSON.parse(fs.readFileSync(path.resolve(corpusArg), "utf8"));
const started = process.hrtime.bigint();
const results = corpus.cases.map((item) => {
  const entities = semantic.extractEntities(item.text).map((entity) => ({
    text: entity.mention, type: entity.type, canonical: entity.normalized,
  }));
  const frames = semantic.extractSemanticFrames(item.text, semantic.extractEntities(item.text));
  return {
    id: item.id,
    text: item.text,
    annotation: {
      entities,
      numericBindings: frames.flatMap((frame) => frame.numericArguments.map((argument) => ({
        numberText: argument.raw,
        subjectText: argument.subject?.mention || frame.subject?.mention || null,
      }))),
      dependencies: frames.filter((frame) => frame.subject).map((frame) => ({
        subjectText: frame.subject.mention,
        predicateLemma: frame.action,
      })),
      attributions: frames.filter((frame) => frame.attribution).map((frame) => ({
        sourceText: frame.attribution.label,
        reportingLemma: frame.attribution.reportingVerb,
      })),
      conditional: frames.some((frame) => frame.conditionality),
      negated: frames.some((frame) => frame.polarity === "denied") || /\bnem\b/iu.test(item.text),
      frames,
    },
  };
});
const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
fs.writeFileSync(path.resolve(outputArg), `${JSON.stringify({
  provider: "deterministic-only",
  candidateOnly: false,
  canonicalProjectionAllowed: true,
  performance: { modelLoadMs: 0, warmTotalMs: elapsedMs, meanMsPerArticle: elapsedMs / results.length },
  results,
}, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
