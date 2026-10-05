"use strict";

const MONTHS = { január: "01", február: "02", március: "03", április: "04", május: "05", június: "06", július: "07", augusztus: "08", szeptember: "09", október: "10", november: "11", december: "12" };
const STOP = new Set(["A", "Az", "Egy", "Azt", "Ha", "Mivel", "Szerint", "Kékfolyó", "Keleti", "Folyóparti"]);
function clean(value) { return String(value || "").trim(); }
function numberValue(raw) { const value = Number(String(raw).replace(/\./g, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function sentences(text) { return clean(text).split(/(?<=[.!?])\s+/u).map((item) => item.trim()).filter(Boolean); }
function predicateFor(sentence) {
  const text = sentence.toLowerCase();
  if (/millió|milliárd/.test(text)) return "PROJECT_COST";
  if (/százalék/.test(text)) return "PERCENTAGE";
  if (/kilométer|méter/.test(text)) return "DISTANCE";
  if (/napos várólista|várakozás/.test(text)) return "WAITING_DAYS";
  if (/megnyit|átadás|indul|próba|bejelent/.test(text)) return "EVENT_STATUS";
  if (/kezdés|munkák|munkálat/.test(text)) return "PROJECT_START";
  if (/kapacitás|teljesítmény/.test(text)) return "CAPACITY";
  if (/költség|keret|összeg/.test(text)) return "AMOUNT";
  return "TEXT_ASSERTION";
}
function unitFor(sentence) {
  const text = sentence.toLowerCase();
  if (/milliárd/.test(text)) return "billion HUF";
  if (/millió/.test(text)) return "million HUF";
  if (/százalék/.test(text)) return "%";
  if (/kilométer/.test(text)) return "km";
  if (/méter/.test(text)) return "m";
  if (/napos|nap/.test(text)) return "day";
  if (/megawattóra/.test(text)) return "MWh";
  return null;
}
function attributionFor(sentence) {
  const match = sentence.match(/([^,–-]{2,50})\s+szerint/iu);
  if (!match) return null;
  const label = clean(match[1]).replace(/^(A|Az|Egy)\s+/u, "");
  return { type: /mérnök|szakértő|orvos|kutató/iu.test(label) ? "expert" : "reported", label };
}
function extractEntities(text) {
  const entities = [];
  const seen = new Set();
  for (const match of clean(text).matchAll(/\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+){0,2})\b/gu)) {
    const mention = clean(match[1]);
    if (STOP.has(mention) || mention.length < 4 || seen.has(mention.toLowerCase())) continue;
    seen.add(mention.toLowerCase());
    entities.push({ mention, normalized: mention.toLowerCase(), type: /program|híd|kórház|iskola|tároló|part/iu.test(mention) ? "organization" : "person" });
  }
  return entities.slice(0, 20);
}
function extractClaims(article) {
  const claims = [];
  for (const sentence of sentences(article.text)) {
    const evidence = sentence;
    const unit = unitFor(sentence);
    const numeric = sentence.match(/(\d+(?:[.,]\d+)?)\s*(millió|milliárd|százalék|kilométer|méter|nap|megawattóra|MWh)/iu);
    const date = sentence.match(/(január|február|március|április|május|június|július|augusztus|szeptember|október|november|december)(?:ban|ben|én)?/iu);
    const explicit = /\bnem\s+(történt|volt|közölt|ígért|nőtt)|\bha\b|(?:[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+){0,2})\s+szerint|\bmondta\b/iu.test(sentence);
    if (!numeric && !date && !explicit) continue;
    const value = numeric ? numberValue(numeric[1]) : date ? date[1].toLowerCase() : clean(sentence).slice(0, 80);
    const polarity = /\bnem\b/iu.test(sentence) ? "negated" : "affirmed";
    const conditional = /\bha\b|\bamennyiben\b|-hat\b|-het\b/iu.test(sentence);
    const modality = conditional ? "conditional" : /ismeretlen|nem közöl|még nem/iu.test(sentence) ? "unknown" : /tervez|várható|indulhat|tolódhat/iu.test(sentence) ? "planned" : "asserted";
    claims.push({ source: article.source?.key || article.source || "", predicate: predicateFor(sentence), value, unit, evidence, polarity, modality, conditional, attribution: attributionFor(sentence) });
  }
  return claims;
}
function predictArticle(article) { return { source: article.source?.key || article.source || "", entities: extractEntities(article.text), claims: extractClaims(article), relations: [], events: [], conflicts: [], changes: [], omissions: [] }; }
function predictArticles(articles) {
  const scenarios = [];
  for (const scenario of Array.isArray(articles?.scenarios) ? articles.scenarios : []) {
    const combined = { id: scenario.id, entities: [], claims: [], relations: [], events: [], conflicts: [], changes: [], omissions: [] };
    for (const article of Array.isArray(scenario.sourceVariants) ? scenario.sourceVariants : []) {
      const prediction = predictArticle(article);
      combined.entities.push(...prediction.entities);
      combined.claims.push(...prediction.claims);
    }
    scenarios.push(combined);
  }
  return { scenarios };
}
module.exports = { extractEntities, extractClaims, predictArticle, predictArticles };
