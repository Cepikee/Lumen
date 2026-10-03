"use strict";

const { createHash } = require("node:crypto");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { PREDICATE_SET, SUPPORT_TYPES } = require("./relation-extraction");

function requireConnection(connection) {
  if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required");
}

function positiveId(value, field) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`);
  return Number(value);
}

function hash(value) { return createHash("sha256").update(String(value)).digest("hex"); }

function relationIdempotencyKey(relation) {
  if (!relation || !PREDICATE_SET.has(relation.predicate)) throw new TypeError("predicate_invalid");
  const subject = positiveId(relation.subjectEntityId, "subject_entity_id");
  const object = positiveId(relation.objectEntityId, "object_entity_id");
  return hash(JSON.stringify([subject, relation.predicate, object, relation.validFrom || null, relation.validUntil || null]));
}

function evidenceHash({ articleId, sourceId = null, evidence }) {
  const article = positiveId(articleId, "article_id");
  if (!evidence || typeof evidence.textSpan !== "string" || !evidence.textSpan) throw new TypeError("evidence_invalid");
  return hash(JSON.stringify([article, sourceId == null ? null : positiveId(sourceId, "source_id"), evidence.start, evidence.end, evidence.textSpan]));
}

async function persistRelationWithEvidence(connection, { relation, articleId, sourceId = null, extractionRunId = null, actor = "v2.relation", operationKey = null }) {
  requireConnection(connection);
  if (!relation || !PREDICATE_SET.has(relation.predicate)) throw new TypeError("predicate_invalid");
  const article = positiveId(articleId, "article_id");
  const source = sourceId == null ? null : positiveId(sourceId, "source_id");
  const run = extractionRunId == null ? null : positiveId(extractionRunId, "extraction_run_id");
  if (!SUPPORT_TYPES.includes(relation.supportType || "support")) throw new TypeError("support_type_invalid");
  const key = operationKey || relationIdempotencyKey(relation);
  const [entityRows] = await connection.execute("SELECT id,status FROM v2_entities WHERE id IN (?,?) ORDER BY id", [relation.subjectEntityId, relation.objectEntityId]);
  if (entityRows.length !== 2 || entityRows.some((row) => ["archived", "merged"].includes(row.status))) throw new Error("resolved_entities_required");
  const [insert] = await connection.execute(
    `INSERT INTO v2_entity_relations
      (subject_entity_id,predicate,object_entity_id,status,confidence,valid_from,valid_until,first_observed_at,last_observed_at,idempotency_key,created_at,updated_at)
     VALUES (?,?,?,'review',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), updated_at=UTC_TIMESTAMP(6)`,
    [Number(relation.subjectEntityId), relation.predicate, Number(relation.objectEntityId), relation.confidence, relation.validFrom, relation.validUntil, key],
  );
  const relationId = Number(insert.insertId);
  const eHash = evidenceHash({ articleId: article, sourceId: source, evidence: relation.evidence });
  const [evidenceInsert] = await connection.execute(
    `INSERT INTO v2_relation_evidence
      (relation_id,article_id,source_id,evidence_hash,text_span,extraction_run_id,support_type,confidence,created_at)
     VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
    [relationId, article, source, eHash, relation.evidence.textSpan, run, relation.supportType || "support", relation.confidence],
  );
  return { relationId, evidenceId: Number(evidenceInsert.insertId), idempotent: Number(insert.affectedRows) === 0 && Number(evidenceInsert.affectedRows) === 0, operationKey: key, actor, resolverVersion: CONTRACT_VERSIONS.resolver };
}

module.exports = { evidenceHash, persistRelationWithEvidence, relationIdempotencyKey };
