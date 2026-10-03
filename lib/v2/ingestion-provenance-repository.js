"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

function isoToMysql(value) {
  if (value == null) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("provenance timestamp must be valid");
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object") throw new TypeError("envelope is required");
  if (envelope.envelopeVersion !== CONTRACT_VERSIONS.ingestionEnvelope) throw new TypeError("unsupported ingestion envelope version");
  if (!envelope.article || typeof envelope.article.urlIdentity !== "string") throw new TypeError("article identity is required");
  if (!envelope.provenance || !/^[0-9a-f]{64}$/i.test(envelope.provenance.operationKey)) throw new TypeError("operation key is required");
}

async function persistIngestionProvenance(connection, { articleId = null, envelope, status = "normalized" }) {
  if (!connection || typeof connection.execute !== "function") throw new TypeError("connection is required");
  validateEnvelope(envelope);
  let result;
  try {
    [result] = await connection.execute(
    `INSERT INTO v2_ingestion_provenance
      (article_id,url_identity,canonical_url,source_id,source_key,publication_at,publication_time_source,
       observed_at,request_id,run_id,operation_key,normalization_version,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      articleId == null ? null : String(articleId),
      envelope.article.urlIdentity,
      envelope.article.canonicalUrl,
      envelope.source?.sourceId ?? null,
      envelope.source?.key ?? null,
      isoToMysql(envelope.publication?.occurredAt),
      envelope.publication?.source ?? null,
      isoToMysql(envelope.observedAt),
      envelope.provenance.requestId,
      envelope.provenance.runId,
      envelope.provenance.operationKey,
      envelope.envelopeVersion,
      status,
    ],
    );
  } catch (error) {
    if (error?.code !== "ER_DUP_ENTRY") throw error;
  }
  if (result?.affectedRows === 1) return { id: Number(result.insertId), inserted: true };
  const [existing] = await connection.execute(
    "SELECT id FROM v2_ingestion_provenance WHERE operation_key=? LIMIT 1",
    [envelope.provenance.operationKey],
  );
  if (existing.length !== 1) throw new Error("provenance_duplicate_without_identity_match");
  return { id: Number(existing[0].id), inserted: false };
}

async function persistInvalidIngestionProvenance(connection, { operationKey, status = "invalid" }) {
  if (!connection || typeof connection.execute !== "function") throw new TypeError("connection is required");
  if (!/^[0-9a-f]{64}$/i.test(String(operationKey || ""))) throw new TypeError("operation key is required");
  let result;
  try {
    [result] = await connection.execute(
    `INSERT INTO v2_ingestion_provenance
      (operation_key,normalization_version,status)
     VALUES (?,?,?)`,
    [String(operationKey).toLowerCase(), CONTRACT_VERSIONS.ingestionEnvelope, status],
    );
  } catch (error) {
    if (error?.code !== "ER_DUP_ENTRY") throw error;
  }
  if (result?.affectedRows === 1) return { id: Number(result.insertId), inserted: true };
  const [existing] = await connection.execute(
    "SELECT id FROM v2_ingestion_provenance WHERE operation_key=? LIMIT 1",
    [String(operationKey).toLowerCase()],
  );
  if (existing.length !== 1) throw new Error("provenance_duplicate_without_identity_match");
  return { id: Number(existing[0].id), inserted: false };
}

module.exports = { persistIngestionProvenance, persistInvalidIngestionProvenance };
