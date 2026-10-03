"use strict";

const { canonicalizeArticleUrl } = require("./article-identity");
const { normalizeSourceIdentity, sourceIdentityFromUrl } = require("./source-identity");
const { parsePublicationTime, resolvePublicationTime } = require("./publication-time");
const { isV2Enabled } = require("./v2/feature-flags");
const { createV2RequestContext } = require("./v2/request-context");
const { createIngestionEnvelope } = require("./v2/ingestion-envelope");
const { persistIngestionProvenance, persistInvalidIngestionProvenance } = require("./v2/ingestion-provenance-repository");

function buildOptionalV2Envelope(item, articleId, observedAt) {
  if (!isV2Enabled()) return undefined;
  try {
    const context = createV2RequestContext({ articleId });
    const input = item == null ? item : {
      ...item,
      ...(observedAt ? { observedAt: observedAt.toISOString() } : {}),
    };
    return createIngestionEnvelope(input, { context });
  } catch {
    // V2 is a shadow handoff in this slice. It must never change legacy
    // ingestion success/failure semantics while the feature is opt-in.
    return { outcome: "error", reason: "v2_envelope_failed", envelope: null };
  }
}

async function persistOptionalV2(connection, item, articleId, status, observedAt) {
  if (!isV2Enabled()) return undefined;
  const envelopeResult = buildOptionalV2Envelope(item, articleId, observedAt);
  if (envelopeResult.outcome !== "normalized") {
    if (!envelopeResult.operationKey) return { envelope: envelopeResult, persistence: { outcome: "skipped", reason: envelopeResult.reason } };
    try {
      const persistence = await persistInvalidIngestionProvenance(connection, {
        operationKey: envelopeResult.operationKey,
        status: envelopeResult.reason === "invalid_url" ? "invalid" : "error",
      });
      return { envelope: envelopeResult, persistence: { outcome: "persisted", ...persistence } };
    } catch {
      return { envelope: envelopeResult, persistence: { outcome: "failed", reason: "persistence_failed" } };
    }
  }
  try {
    const persistence = await persistIngestionProvenance(connection, {
      articleId,
      envelope: envelopeResult.envelope,
      status,
    });
    return { envelope: envelopeResult, persistence: { outcome: "persisted", ...persistence } };
  } catch {
    // Shadow audit is non-blocking until the M2 persistence contract is enabled
    // for a blocking pipeline transaction. Legacy article ingestion must survive.
    return { envelope: envelopeResult, persistence: { outcome: "failed", reason: "persistence_failed" } };
  }
}

async function ingestFeedArticle(connection, item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return {
      outcome: "invalid_article",
      articleId: null,
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, item, null, "invalid") } : {}),
    };
  }
  const canonicalUrl = canonicalizeArticleUrl(item.originalUrl);
  if (!canonicalUrl) {
    return {
      outcome: "malformed_url",
      articleId: null,
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, item, null, "invalid") } : {}),
    };
  }
  const source = sourceIdentityFromUrl(canonicalUrl) || normalizeSourceIdentity(item.source);
  if (!source) {
    return {
      outcome: "unknown_source",
      articleId: null,
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, item, null, "unknown_source") } : {}),
    };
  }
  const ingestionTime = item.ingestedAt instanceof Date
    ? item.ingestedAt
    : parsePublicationTime(item.ingestedAt) || new Date();
  const publication = resolvePublicationTime([
    { value: item.publishedAt, source: "feed_explicit" },
    { value: item.metadataPublishedAt, source: "article_metadata" },
  ], ingestionTime);
  const externalId = String(item.externalId || "").trim().slice(0, 512) || null;
  const [result] = await connection.execute(
    `INSERT IGNORE INTO articles
      (title,url_canonical,original_url,external_id,content_text,published_at,publication_time_source,
       language,source_id,source,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`,
    [String(item.title || "").slice(0, 500), canonicalUrl, String(item.originalUrl), externalId,
      String(item.content || ""), publication.mysqlUtc, publication.source, item.language || "hu",
      source.sourceId, source.key],
  );
  let articleId = Number(result.insertId);
  const inserted = result.affectedRows === 1;
  if (!inserted) {
    const [existing] = await connection.execute(
      "SELECT id FROM articles WHERE url_identity=SHA2(?,256) LIMIT 1",
      [canonicalUrl],
    );
    if (existing.length !== 1) throw new Error("feed_ingestion_duplicate_without_identity_match");
    articleId = Number(existing[0].id);
  }
  return {
    outcome: inserted ? "inserted" : "deduplicated",
    articleId,
    canonicalUrl,
    source: source.key,
    publicationTimeSource: publication.source,
    ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, item, articleId, inserted ? "normalized" : "deduplicated", ingestionTime) } : {}),
  };
}

module.exports = { ingestFeedArticle };
