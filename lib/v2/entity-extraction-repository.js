"use strict";

const { createHash } = require("node:crypto");
const { CONTRACT_VERSIONS } = require("./contract-versions");

function hash(value) { return createHash("sha256").update(String(value)).digest("hex"); }

function operationKey(articleId, envelope) {
  return hash([articleId, envelope.article.urlIdentity, envelope.envelopeVersion, CONTRACT_VERSIONS.extractionSchema].join("|"));
}

async function persistEntityExtraction(connection, { articleId, envelope, outcome, startedAt = new Date() }) {
  if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required");
  if (!Number.isSafeInteger(Number(articleId)) || Number(articleId) <= 0) throw new TypeError("article_id_invalid");
  const key = operationKey(articleId, envelope);
  const inputHash = hash(`${envelope.article.title || ""}\n${envelope.article.contentText || ""}`);
  const status = outcome.status === "completed" ? "completed" : "failed";
  const safeError = outcome.status === "completed" ? null : JSON.stringify({ code: outcome.status, errors: outcome.errors || undefined, error: outcome.error || undefined }).slice(0, 4000);
  const [insert] = await connection.execute(
    `INSERT INTO v2_ai_runs
      (article_id,step_name,provider,model,prompt_version,extractor_version,schema_version,input_hash,sanitized_input_ref,status,started_at,completed_at,input_tokens,output_tokens,estimated_cost,cache_hit,structured_result_ref,error_metadata,operation_key,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
    [Number(articleId), "entity_extraction", outcome.provider || "mock", outcome.model || "deterministic-mock-entity-v1", "m4-entity-extraction.1", "m4-entity-extraction.1", CONTRACT_VERSIONS.extractionSchema, inputHash, `article:${articleId}:input:${inputHash}`, status, startedAt, new Date(), null, null, null, false, outcome.status === "completed" ? `sha256:${hash(JSON.stringify(outcome.result))}` : null, safeError, key],
  );
  const runId = Number(insert.insertId);
  const mentions = [];
  if (status === "completed" && outcome.result?.entities?.length) {
    for (const entity of outcome.result.entities) {
      const [mentionInsert] = await connection.execute(
        `INSERT INTO v2_entity_mentions
          (article_id,summary_id,entity_id,raw_text,normalized_text,entity_type,start_offset,end_offset,extraction_run_id,confidence,resolution_status,created_at)
         SELECT ?,NULL,NULL,?,?,?,?,?,?,?,'unresolved',UTC_TIMESTAMP(6)
         WHERE NOT EXISTS (
           SELECT 1 FROM v2_entity_mentions WHERE article_id=? AND extraction_run_id=? AND start_offset=? AND end_offset=?
         )`,
        [Number(articleId), entity.mentionText, entity.normalizedCandidateName, entity.entityType, entity.evidence.start, entity.evidence.end, runId, entity.confidence, Number(articleId), runId, entity.evidence.start, entity.evidence.end],
      );
      let mentionId = Number(mentionInsert.insertId);
      if (!mentionId) {
        const [existing] = await connection.execute("SELECT id FROM v2_entity_mentions WHERE article_id=? AND extraction_run_id=? AND start_offset=? AND end_offset=? LIMIT 1", [Number(articleId), runId, entity.evidence.start, entity.evidence.end]);
        mentionId = Number(existing[0]?.id || 0);
      }
      if (mentionId) mentions.push({ id: mentionId, mentionText: entity.mentionText, normalizedCandidateName: entity.normalizedCandidateName, entityType: entity.entityType, confidence: entity.confidence, evidence: entity.evidence });
    }
  }
  return { runId, operationKey: key, status, mentionCount: mentions.length, mentions };
}

module.exports = { persistEntityExtraction, operationKey };
