"use strict";

const SENSITIVE = /\b(öngyilkoss|szexuális erőszak|megerőszak|gyermekbántalmaz|holttest|brutális gyilkoss)\w*/iu;

function imagePolicy(article, options = {}) {
  const title = typeof article?.title === "string" ? article.title.trim() : "";
  const summary = typeof article?.short_summary === "string" ? article.short_summary.trim() : "";
  if (!title && !summary) return { action: "fallback_only", reason: "missing_editorial_context" };
  if (SENSITIVE.test(`${title} ${summary}`)) return { action: "fallback_only", reason: "sensitive_subject" };
  if (options.force === true) return { action: "generate", reason: "operator_force" };
  if (options.enabled === false) return { action: "fallback_only", reason: "feature_disabled" };
  return { action: "generate", reason: "eligible" };
}

module.exports = { imagePolicy };
