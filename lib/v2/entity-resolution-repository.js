"use strict";

const { normalizeEntityName } = require("./entity-normalization");
const { CONTRACT_VERSIONS } = require("./contract-versions");
const { applyResolutionPolicy } = require("./entity-resolution-policy");
const { CANDIDATE_POLICY, rankCandidates } = require("./entity-resolution-candidates");
const { createHash } = require("node:crypto");

function requireConnection(connection) {
  if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required");
}

function positiveId(value, field) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`);
  return String(value);
}

function inputKey(value, language) {
  const result = normalizeEntityName(value, { language });
  if (result.status !== "valid") throw new TypeError(result.reason);
  return result.normalizedName;
}

async function lookupExactEntity(connection, { name, entityType, language = "hu" }) {
  requireConnection(connection);
  if (typeof entityType !== "string" || !entityType.trim()) throw new TypeError("entity_type_invalid");
  const normalized = inputKey(name, language);
  const type = entityType.trim();
  const lang = String(language).trim().toLowerCase();
  const [canonicalRows] = await connection.execute(
    `SELECT id, entity_type, canonical_name, normalized_name, language, status
       FROM v2_entities
      WHERE entity_type=? AND language=?
        AND normalized_name COLLATE utf8mb4_bin = ?
      ORDER BY id`,
    [type, lang, normalized],
  );
  if (canonicalRows.length > 1) {
    return { status: "ambiguous", matchType: "canonical", normalized, candidates: canonicalRows.map((row) => ({ entityId: Number(row.id), ...row })) };
  }
  if (canonicalRows.length === 1) {
    return { status: "resolved", matchType: "canonical", normalized, entityId: Number(canonicalRows[0].id), entity: canonicalRows[0] };
  }

  const [aliasRows] = await connection.execute(
    `SELECT a.id AS alias_id, a.entity_id, e.entity_type, e.canonical_name,
            e.normalized_name, e.language, a.alias, a.normalized_alias, a.status AS alias_status
       FROM v2_entity_aliases a
       JOIN v2_entities e ON e.id=a.entity_id
      WHERE a.language=? AND a.normalized_alias COLLATE utf8mb4_bin = ?
        AND e.entity_type=? AND a.status <> 'rejected'
      ORDER BY a.entity_id, a.id`,
    [lang, normalized, type],
  );
  const byEntity = new Map();
  for (const row of aliasRows) if (!byEntity.has(String(row.entity_id))) byEntity.set(String(row.entity_id), row);
  const candidates = [...byEntity.values()];
  if (candidates.length > 1) {
    return { status: "ambiguous", matchType: "alias", normalized, review: "alias_collision", candidates: candidates.map((row) => ({ entityId: Number(row.entity_id), aliasId: Number(row.alias_id), ...row })) };
  }
  if (candidates.length === 1) {
    return { status: "resolved", matchType: "alias", normalized, entityId: Number(candidates[0].entity_id), aliasId: Number(candidates[0].alias_id), entity: candidates[0] };
  }
  return { status: "unresolved", matchType: null, normalized, candidates: [] };
}

async function resolveExactEntity(connection, { name, entityType, language = "hu", confidence, enabled = true }) {
  if (!enabled) return Object.freeze({ status: "disabled", resolutionStatus: "disabled", normalized: null, candidates: [] });
  return applyResolutionPolicy(await lookupExactEntity(connection, { name, entityType, language }), confidence);
}

async function findEntityCandidates(connection, { name, entityType, language = "hu", limit = CANDIDATE_POLICY.limit }) {
  requireConnection(connection);
  if (typeof entityType !== "string" || !entityType.trim()) throw new TypeError("entity_type_invalid");
  const normalized = inputKey(name, language);
  const safeLimit = Number(limit);
  if (!Number.isSafeInteger(safeLimit) || safeLimit < 1 || safeLimit > CANDIDATE_POLICY.limit) throw new TypeError("candidate_limit_invalid");
  const type = entityType.trim();
  const lang = String(language).trim().toLowerCase();
  const tokens = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 3);
  if (!tokens.length) return [];
  const clauses = tokens.map(() => "(e.normalized_name COLLATE utf8mb4_bin LIKE CONCAT('%', ?, '%') OR a.normalized_alias COLLATE utf8mb4_bin LIKE CONCAT('%', ?, '%'))").join(" OR ");
  const params = tokens.flatMap((token) => [token, token]);
  const [rows] = await connection.execute(
    `SELECT DISTINCT e.id AS entity_id, e.entity_type, e.canonical_name, e.normalized_name,
            e.language, e.status, a.id AS alias_id, a.alias, a.normalized_alias
       FROM v2_entities e
       LEFT JOIN v2_entity_aliases a ON a.entity_id=e.id AND a.language=e.language AND a.status <> 'rejected'
      WHERE e.entity_type=? AND e.language=? AND e.status IN ('review','active','disputed')
        AND (${clauses})
      ORDER BY e.id
      LIMIT ?`, [type, lang, ...params, safeLimit],
  );
  return rows.map((row) => ({ ...row, entityId: Number(row.entity_id), entityType: row.entity_type, normalizedName: row.normalized_name, normalizedAlias: row.normalized_alias || null }));
}

async function resolveEntityMention(connection, { name, entityType, language = "hu", confidence, context = {}, enabled = true }) {
  if (!enabled) return Object.freeze({ status: "disabled", resolutionStatus: "disabled", method: "disabled", candidates: [], providerCalls: 0 });
  const exact = await resolveExactEntity(connection, { name, entityType, language, confidence, enabled: true });
  if (exact.resolutionStatus === "resolved_exact" || exact.resolutionStatus === "ambiguous") {
    return Object.freeze({ ...exact, method: exact.matchType === "alias" ? "exact_alias" : "exact_canonical", providerCalls: 0 });
  }
  const candidates = await findEntityCandidates(connection, { name, entityType, language });
  return Object.freeze({ ...rankCandidates({ name, entityType, language }, candidates, context), providerCalls: 0 });
}

function resolutionOperationKey(mentionId, result) {
  return createHash("sha256").update(JSON.stringify([String(mentionId), result.resolverVersion, result.method, result.selectedEntityId || null, result.confidence || null])).digest("hex");
}

async function persistEntityResolution(connection, { mentionId, result, actor = "v2.resolver", runId = null, operationKey = null }) {
  requireConnection(connection);
  const mention = positiveId(mentionId, "mention_id");
  if (!result || result.resolutionStatus !== "resolved_exact" || !Number.isSafeInteger(Number(result.entityId)) || Number(result.entityId) <= 0) throw new TypeError("resolution_not_persistable");
  const key = operationKey || resolutionOperationKey(mention, result);
  const [currentRows] = await connection.execute("SELECT id,entity_id,confidence,resolution_status FROM v2_entity_mentions WHERE id=? FOR UPDATE", [mention]);
  if (currentRows.length !== 1) throw new Error("mention_not_found");
  const current = currentRows[0];
  if (current.resolution_status === "resolved_exact") {
    if (String(current.entity_id) !== String(result.entityId)) throw new Error("resolution_conflict");
    return { mentionId: Number(mention), entityId: Number(current.entity_id), operationKey: key, idempotent: true };
  }
  const [update] = await connection.execute("UPDATE v2_entity_mentions SET entity_id=?, confidence=?, resolution_status=? WHERE id=? AND resolution_status IN ('unresolved','review','ambiguous')", [Number(result.entityId), result.confidence, "resolved_exact", mention]);
  if (Number(update?.affectedRows) !== 1) throw new Error("resolution_conflict");
  const [audit] = await connection.execute(
    `INSERT INTO v2_entity_graph_history (mutation_type,object_type,object_id,before_json,after_json,operation_key,actor,run_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
    ["entity_resolution", "entity_mention", Number(mention), JSON.stringify({ entityId: current.entity_id, resolutionStatus: current.resolution_status }), JSON.stringify({ entityId: Number(result.entityId), resolutionStatus: "resolved_exact", method: result.method, confidence: result.confidence, resolverVersion: result.resolverVersion }), key, actor, runId],
  );
  await connection.execute(
    `INSERT INTO v2_confidence_history (object_type,object_id,old_confidence,new_confidence,reason,evidence_delta,resolver_version,created_at)
     VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
    ["entity_mention", Number(mention), current.confidence, result.confidence, "entity_resolution", JSON.stringify(result.evidence || {}), result.resolverVersion || null],
  );
  return { mentionId: Number(mention), entityId: Number(result.entityId), operationKey: key, idempotent: Number(audit?.affectedRows) === 0 };
}

async function persistObservedAlias(connection, { entityId, mentionId, extractionRunId = null, alias, language = "hu", aliasType = "observed", confidence = null }) {
  requireConnection(connection);
  const entity = positiveId(entityId, "entity_id");
  const mention = positiveId(mentionId, "mention_id");
  const normalized = normalizeEntityName(alias, { language });
  const lang = String(language).trim().toLowerCase();
  if (aliasType !== "observed") throw new TypeError("alias_type_invalid");
  if (confidence != null && (!Number.isFinite(Number(confidence)) || Number(confidence) < 0 || Number(confidence) > 1)) throw new TypeError("confidence_invalid");
  const [validMention] = await connection.execute(
    "SELECT id, extraction_run_id FROM v2_entity_mentions WHERE id=? AND raw_text IS NOT NULL LIMIT 1",
    [mention],
  );
  if (validMention.length !== 1) throw new Error("mention_not_found");
  const runId = extractionRunId == null ? validMention[0].extraction_run_id : positiveId(extractionRunId, "extraction_run_id");
  const [aliasResult] = await connection.execute(
    `INSERT INTO v2_entity_aliases (entity_id,alias,normalized_alias,language,alias_type,status,confidence,created_at,updated_at)
     VALUES (?,?,?,?,?,'review',?,?,UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), updated_at=UTC_TIMESTAMP(6)`,
    [entity, normalized.displayName, normalized.normalizedName, lang, aliasType, confidence, new Date()],
  );
  const aliasId = Number(aliasResult.insertId);
  await connection.execute(
    `INSERT INTO v2_entity_alias_observations
      (alias_id,mention_id,extraction_run_id,observed_alias,normalized_alias,language,normalization_version,created_at)
     VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
    [aliasId, mention, runId, normalized.displayName, normalized.normalizedName, lang, CONTRACT_VERSIONS.vocabulary],
  );
  return { aliasId, mentionId: Number(mention), normalizedAlias: normalized.normalizedName, status: "review" };
}

module.exports = { lookupExactEntity, resolveExactEntity, findEntityCandidates, resolveEntityMention, persistEntityResolution, persistObservedAlias, resolutionOperationKey };
