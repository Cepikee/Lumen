"use strict";

const { canonicalizeArticleUrl } = require("./article-identity");
const { normalizeSourceIdentity, sourceIdentityFromUrl } = require("./source-identity");
const { parsePublicationTime, resolvePublicationTime } = require("./publication-time");

async function ingestFeedArticle(connection, item) {
  const canonicalUrl = canonicalizeArticleUrl(item.originalUrl);
  if (!canonicalUrl) return { outcome: "malformed_url", articleId: null };
  const source = sourceIdentityFromUrl(canonicalUrl) || normalizeSourceIdentity(item.source);
  if (!source) return { outcome: "unknown_source", articleId: null };
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
  };
}

module.exports = { ingestFeedArticle };
