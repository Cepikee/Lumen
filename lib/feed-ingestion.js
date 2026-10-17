"use strict";

const { canonicalizeArticleUrl } = require("./article-identity");
const { normalizeSourceIdentity, sourceIdentityFromUrl } = require("./source-identity");
const { parsePublicationTime, resolvePublicationTime } = require("./publication-time");
const { isV2Enabled } = require("./v2/feature-flags");
const { createV2RequestContext } = require("./v2/request-context");
const { createIngestionEnvelope } = require("./v2/ingestion-envelope");
const { persistIngestionProvenance, persistInvalidIngestionProvenance } = require("./v2/ingestion-provenance-repository");

const MAX_FEED_CONTENT_LENGTH = 100_000;
const MAX_FEED_TITLE_LENGTH = 500;
const MAX_EXTERNAL_ID_LENGTH = 512;

function buildOptionalV2Envelope(item, articleId, observedAt, databaseSourceId) {
  if (!isV2Enabled()) return undefined;
  try {
    const context = createV2RequestContext({ articleId });
    const input = item == null ? item : {
      ...item,
      ...(observedAt ? { observedAt: observedAt.toISOString() } : {}),
    };
    const result = createIngestionEnvelope(input, { context });
    if (result.outcome === "normalized" && result.envelope.source && Number.isSafeInteger(databaseSourceId)) {
      result.envelope = {
        ...result.envelope,
        source: { ...result.envelope.source, sourceId: databaseSourceId },
      };
    }
    return result;
  } catch {
    // V2 is a shadow handoff in this slice. It must never change legacy
    // ingestion success/failure semantics while the feature is opt-in.
    return { outcome: "error", reason: "v2_envelope_failed", envelope: null };
  }
}

async function persistOptionalV2(connection, item, articleId, status, observedAt, databaseSourceId) {
  if (!isV2Enabled()) return undefined;
  const envelopeResult = buildOptionalV2Envelope(item, articleId, observedAt, databaseSourceId);
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
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, boundedItem, null, "invalid") } : {}),
    };
  }
  const boundedItem = {
    ...item,
    title: String(item.title || "").slice(0, MAX_FEED_TITLE_LENGTH),
    content: String(item.content || "").slice(0, MAX_FEED_CONTENT_LENGTH),
    externalId: String(item.externalId || "").trim().slice(0, MAX_EXTERNAL_ID_LENGTH),
  };
  const canonicalUrl = canonicalizeArticleUrl(boundedItem.originalUrl);
  if (!canonicalUrl) {
    return {
      outcome: "malformed_url",
      articleId: null,
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, item, null, "invalid") } : {}),
    };
  }
  const source = sourceIdentityFromUrl(canonicalUrl) || normalizeSourceIdentity(boundedItem.source);
  if (!source) {
    return {
      outcome: "unknown_source",
      articleId: null,
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, boundedItem, null, "unknown_source") } : {}),
    };
  }
  // Source IDs are database identities, not the fixed IDs from the canonical
  // source vocabulary. Resolve the current row by slug so resets/migrations
  // and imported databases cannot route a valid feed to a stale foreign key.
  const [sourceRows] = await connection.execute(
    "SELECT id, is_active FROM sources WHERE slug = ? LIMIT 1",
    [source.key],
  );
  if (!Array.isArray(sourceRows) || sourceRows.length !== 1 || Number(sourceRows[0].is_active) !== 1) {
    return {
      outcome: "unknown_source",
      articleId: null,
      ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, item, null, "unknown_source") } : {}),
    };
  }
  const databaseSourceId = Number(sourceRows[0].id);
  const ingestionTime = boundedItem.ingestedAt instanceof Date
    ? boundedItem.ingestedAt
    : parsePublicationTime(boundedItem.ingestedAt) || new Date();
  const publication = resolvePublicationTime([
    { value: boundedItem.publishedAt, source: "feed_explicit" },
    { value: boundedItem.metadataPublishedAt, source: "article_metadata" },
  ], ingestionTime);
  const externalId = boundedItem.externalId || null;
  const [result] = await connection.execute(
    `INSERT IGNORE INTO articles
      (title,url_canonical,original_url,external_id,content_text,published_at,publication_time_source,
       language,source_id,source,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`,
    [boundedItem.title, canonicalUrl, String(boundedItem.originalUrl), externalId,
      boundedItem.content, publication.mysqlUtc, publication.source, boundedItem.language || "hu",
      databaseSourceId, source.key],
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
    ...(isV2Enabled() ? { v2: await persistOptionalV2(connection, boundedItem, articleId, inserted ? "normalized" : "deduplicated", ingestionTime, databaseSourceId) } : {}),
  };
}

module.exports = { ingestFeedArticle };
