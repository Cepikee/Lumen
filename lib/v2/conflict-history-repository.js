"use strict";

const { createHash } = require("node:crypto");
const { validateConflict } = require("./conflict-history");

function requireConnection(connection) { if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required"); }
function id(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function confidence(value, field) { if (value == null) return null; const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 1) throw new TypeError(`${field}_invalid`); return n; }
function json(value, field) { if (value == null) return null; try { return JSON.stringify(value); } catch { throw new TypeError(`${field}_invalid`); } }
function confidenceOperationKey(input) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }

async function persistConflict(connection, conflict, { actor = "v2.conflict-detector", resolver = null } = {}) {
  requireConnection(connection);
  const valid = validateConflict(conflict);
  if (valid.status !== "valid") throw new TypeError(valid.errors[0]);
  const explanation = json({ claims: conflict.claims, evidence: conflict.evidence, attribution: conflict.attribution, temporal: conflict.temporal, comparison: conflict.comparison, automaticWinner: null }, "explanation");
  const [result] = await connection.execute(
    `INSERT IGNORE INTO v2_conflicts (conflict_type,fingerprint,scope_type,scope_id,severity,state,explanation_json,resolver,detected_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     `,
    [conflict.conflictType, conflict.fingerprint, conflict.scopeType, Number(conflict.scopeId), conflict.severity, "open", explanation, resolver,]
  );
  const [rows] = await connection.execute("SELECT id FROM v2_conflicts WHERE fingerprint=? LIMIT 1", [conflict.fingerprint]);
  if (rows.length !== 1) throw new Error("conflict_persistence_failed");
  return { conflictId: Number(rows[0].id), fingerprint: conflict.fingerprint, state: "open", idempotent: Number(result.affectedRows) === 0, automaticWinner: null, actor };
}

async function recordConfidenceChange(connection, input) {
  requireConnection(connection);
  if (!input || typeof input !== "object") throw new TypeError("confidence_change_required");
  const objectType = String(input.objectType || "").trim();
  if (!objectType || objectType.length > 32) throw new TypeError("object_type_invalid");
  const objectId = id(input.objectId, "object_id");
  const oldConfidence = confidence(input.oldConfidence, "old_confidence");
  const newConfidence = confidence(input.newConfidence, "new_confidence");
  const reason = String(input.reason || "").trim();
  if (!reason || reason.length > 255) throw new TypeError("reason_invalid");
  const operationKey = input.operationKey || confidenceOperationKey({ objectType, objectId, oldConfidence, newConfidence, reason, evidenceDelta: input.evidenceDelta ?? null, ruleVersion: input.ruleVersion ?? null, modelVersion: input.modelVersion ?? null, resolverVersion: input.resolverVersion ?? null });
  if (!/^[a-f0-9]{64}$/.test(String(operationKey))) throw new TypeError("operation_key_invalid");
  const [audit] = await connection.execute(
    `INSERT IGNORE INTO v2_entity_graph_history (mutation_type,object_type,object_id,before_json,after_json,operation_key,actor,run_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
    ["confidence_change", objectType, objectId, json({ confidence: oldConfidence }, "before"), json({ confidence: newConfidence, reason }, "after"), operationKey, String(input.actor || "v2.confidence"), input.runId == null ? null : id(input.runId, "run_id")]
  );
  if (Number(audit.affectedRows) === 0) {
    const [existing] = await connection.execute("SELECT id FROM v2_entity_graph_history WHERE operation_key=? LIMIT 1", [operationKey]);
    return { operationKey, idempotent: true, historyId: existing.length === 1 ? Number(existing[0].id) : null };
  }
  const [history] = await connection.execute(
    `INSERT INTO v2_confidence_history (object_type,object_id,old_confidence,new_confidence,reason,evidence_delta,rule_version,model_version,resolver_version,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
    [objectType, objectId, oldConfidence, newConfidence, reason, json(input.evidenceDelta ?? null, "evidence_delta"), input.ruleVersion ?? null, input.modelVersion ?? null, input.resolverVersion ?? null]
  );
  return { operationKey, historyId: Number(history.insertId), idempotent: false };
}

module.exports = { confidenceOperationKey, persistConflict, recordConfidenceChange };
