"use strict";

const { createHash } = require("node:crypto");
const { canonicalizeArticleUrl } = require("../article-identity");
const { normalizeSourceIdentity, sourceIdentityFromUrl } = require("../source-identity");
const { parsePublicationTime } = require("../publication-time");
const { CONTRACT_VERSIONS } = require("./contract-versions");

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value) {
  if (value == null) return null;
  const normalized = String(value)
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return normalized || null;
}

function firstPublication(values) {
  for (const candidate of values) {
    const date = parsePublicationTime(candidate.value);
    if (date) return { occurredAt: date.toISOString(), source: candidate.source };
  }
  return { occurredAt: null, source: null };
}

function parseObservedAt(value) {
  const date = parsePublicationTime(value);
  return date ? date.toISOString() : null;
}

function normalizeContext(context) {
  if (context == null) return { requestId: null, runId: null };
  if (typeof context !== "object" || Array.isArray(context)) throw new TypeError("context must be an object");
  const requestId = context.requestId == null ? null : String(context.requestId).trim().toLowerCase();
  const runId = context.runId == null ? null : String(context.runId).trim().toLowerCase();
  if ((requestId && !UUID_PATTERN.test(requestId)) || (runId && !UUID_PATTERN.test(runId))) {
    throw new TypeError("context requestId/runId must be UUIDs");
  }
  return { requestId, runId };
}

function operationKeyFor(item, canonicalUrl, source) {
  const explicit = String(item.ingestionOperationKey ?? "").trim();
  const seed = explicit || [source?.key || "unknown", String(item.externalId ?? "").trim(), canonicalUrl].join("|");
  return createHash("sha256").update(seed).digest("hex");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function createIngestionEnvelope(item, options = {}) {
  if (item == null || typeof item !== "object" || Array.isArray(item)) {
    return { outcome: "invalid", reason: "invalid_article", envelope: null };
  }
  if (options == null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }

  const canonicalUrl = canonicalizeArticleUrl(item.originalUrl ?? item.url);
  if (!canonicalUrl) return {
    outcome: "invalid",
    reason: "invalid_url",
    operationKey: createHash("sha256").update(String(item.ingestionOperationKey ?? item.originalUrl ?? item.url ?? "")).digest("hex"),
    envelope: null,
  };

  const source = sourceIdentityFromUrl(canonicalUrl) || normalizeSourceIdentity(item.source);
  const publication = firstPublication([
    { value: item.publishedAt, source: "feed_explicit" },
    { value: item.pubDate, source: "feed_pub_date" },
    { value: item.isoDate, source: "feed_iso_date" },
    { value: item.date, source: "feed_date" },
  ]);
  const context = normalizeContext(options.context);
  const envelope = {
    envelopeVersion: CONTRACT_VERSIONS.ingestionEnvelope,
    article: {
      canonicalUrl,
      urlIdentity: createHash("sha256").update(canonicalUrl).digest("hex"),
      title: normalizeText(item.title),
      contentText: normalizeText(item.content ?? item.contentText),
    },
    source: source
      ? { sourceId: source.sourceId, key: source.key, displayName: source.displayName }
      : null,
    publication,
    observedAt: parseObservedAt(item.observedAt ?? item.ingestedAt ?? item.fetchedAt),
    provenance: {
      requestId: context.requestId,
      runId: context.runId,
      operationKey: operationKeyFor(item, canonicalUrl, source),
    },
    normalization: {
      text: "NFC, zero-width removal, CRLF normalization, empty-line removal, trim",
      source: "canonical-source-identity",
      url: "canonical-article-url",
      publicationTime: "explicit-timezone-only",
    },
  };
  return { outcome: "normalized", envelope: deepFreeze(envelope) };
}

module.exports = { createIngestionEnvelope, normalizeText };
