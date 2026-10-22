"use strict";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("hu-HU")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

function jaccardSimilarity(a, b) {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

function sentences(value) {
  return String(value || "")
    .split(/(?<=[.!?])\s+|[\r\n]+/u)
    .map((text) => ({ text: text.trim(), normalized: normalizeText(text) }))
    .filter((item) => item.normalized.split(" ").length >= 8);
}

function exactSentenceMatches(source, generated) {
  const sourceSentences = new Set(sentences(source).map((item) => item.normalized));
  return sentences(generated)
    .filter((item) => sourceSentences.has(item.normalized))
    .map((item) => ({ tokenCount: item.normalized.split(" ").length }));
}

function longestContiguousTokenMatch(source, generated) {
  const left = tokens(source);
  const right = tokens(generated);
  if (!left.length || !right.length) return 0;
  let previous = new Uint16Array(right.length + 1);
  let longest = 0;
  for (const sourceToken of left) {
    const current = new Uint16Array(right.length + 1);
    for (let index = 1; index <= right.length; index += 1) {
      if (sourceToken === right[index - 1]) {
        current[index] = previous[index - 1] + 1;
        if (current[index] > longest) longest = current[index];
      }
    }
    previous = current;
  }
  return longest;
}

function quoteOverlaps(source, generated) {
  const normalizedSource = normalizeText(source);
  const quotes = [...String(generated || "").matchAll(/[„“”"]([^„“”"]{20,})[„“”"]/gu)];
  return quotes
    .map((match) => normalizeText(match[1]))
    .filter((quote) => quote.split(" ").length >= 6 && normalizedSource.includes(quote))
    .map((quote) => ({ tokenCount: quote.split(" ").length }));
}

function assessContentOverlap(source, generated) {
  const jaccard = jaccardSimilarity(source, generated);
  const sentenceMatches = exactSentenceMatches(source, generated);
  const longestTokenRun = longestContiguousTokenMatch(source, generated);
  const matchingQuotes = quoteOverlaps(source, generated);
  const reasons = [];
  if (jaccard >= 0.55) reasons.push("high_token_jaccard");
  if (sentenceMatches.some((item) => item.tokenCount >= 12)) reasons.push("exact_sentence_overlap");
  if (longestTokenRun >= 18) reasons.push("long_verbatim_span");
  if (matchingQuotes.some((item) => item.tokenCount >= 12)) reasons.push("long_direct_quote_overlap");
  return Object.freeze({
    jaccard,
    exactSentenceMatchCount: sentenceMatches.length,
    longestTokenRun,
    directQuoteMatchCount: matchingQuotes.length,
    reviewRequired: reasons.length > 0,
    reasons: Object.freeze(reasons),
  });
}

module.exports = {
  normalizeText,
  jaccardSimilarity,
  exactSentenceMatches,
  longestContiguousTokenMatch,
  quoteOverlaps,
  assessContentOverlap,
};
