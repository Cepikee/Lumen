"use strict";

const { createHash } = require("node:crypto");
const PROMPT_VERSION = "UTOM_EDITORIAL_V1";

function clean(value, max = 500) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/https?:\/\/\S+/gi, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(value, max = 8) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return values.map((item) => clean(item, 80)).filter(Boolean).slice(0, max);
}

function visualCue(article) {
  const factual = clean(article.short_summary || article.long_summary || article.title, 800).toLocaleLowerCase("hu-HU");
  if (/\b(nőtt|növekedett|emelkedett|bővült|erősödött)\b/u.test(factual)) {
    return "A subtle upward visual rhythm is allowed, but do not show arrows, charts, labels, exact values or invented data.";
  }
  if (/\b(csökkent|visszaesett|gyengült|romlott|zsugorodott)\b/u.test(factual)) {
    return "A restrained sense of downward pressure is allowed, but do not show arrows, charts, labels, exchange rates or invented data.";
  }
  if (/\b(mesterséges intelligencia|adatközpont|chip|félvezető|technológ)\w*/u.test(factual)) {
    return "Abstract computing, datacenter or semiconductor imagery is allowed when it follows directly from the factual context.";
  }
  return "Keep the visual direction neutral; do not imply growth, decline or numerical performance.";
}

function buildImagePrompt(article) {
  const category = clean(article.category, 80) || "általános hírek";
  const keywords = list(article.keywords).join(", ") || "nincs";
  const entities = list(article.entities, 6).join(", ") || "nincs";
  const summary = clean(article.short_summary || article.long_summary, 600);
  return [
    "Create a restrained editorial news illustration in a premium Hungarian digital newsroom style.",
    `Primary factual context: ${summary || clean(article.title, 240) || "Untitled news"}.`,
    `Secondary headline context: ${clean(article.title, 240) || "Untitled news"}. Treat headline rhetoric as secondary to the factual context.`,
    `Category: ${category}. Keywords: ${keywords}. Non-person context entities: ${entities}.`,
    visualCue(article),
    "Use cinematic but credible lighting, clean composition, dark blue editorial palette with subtle cyan accents, realistic materials, 16:9 landscape.",
    "Represent the subject symbolically. Do not depict an identifiable real person or imply an unsupported event.",
    "No text, letters, words, numbers, logos, watermarks, flags with writing, fake charts, UI, captions or random symbols.",
    "No graphic injury, humiliating depiction, sensationalism or political endorsement.",
  ].join(" ");
}

function imageFingerprint({ articleId, prompt, provider, model, width, height, forceRevision = 0 }) {
  return createHash("sha256").update(JSON.stringify({ articleId, promptVersion: PROMPT_VERSION, prompt, provider, model, width, height, forceRevision })).digest("hex");
}

module.exports = { PROMPT_VERSION, buildImagePrompt, imageFingerprint };
