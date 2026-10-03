"use strict";

const { decideRoute, decisionOperationKey } = require("./ai-cost-router");

function requireConnection(connection) { if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required"); }
function positiveId(value, field) { if (value == null) return null; if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function safeJson(value) { if (value == null) return null; try { return JSON.stringify(value); } catch { throw new TypeError("budget_snapshot_invalid"); } }

async function persistDecision(connection, input) {
  requireConnection(connection);
  const decision = decideRoute(input);
  if (decision.status !== "valid") throw new TypeError(decision.errors[0]);
  const articleId = positiveId(input.articleId, "article_id");
  if (articleId == null) throw new TypeError("article_id_required_for_persistence");
  const key = input.operationKey || decisionOperationKey({ ...input, articleId });
  const [insert] = await connection.execute(
    `INSERT IGNORE INTO v2_ai_decisions (article_id,step_name,input_fingerprint,route,reason,budget_snapshot,provider,model,escalation,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
    [articleId, decision.result.step, decision.result.inputFingerprint, decision.result.route, decision.result.reason, safeJson(decision.result.budgetSnapshot), decision.result.provider, decision.result.model, decision.result.escalation],
  );
  const [rows] = await connection.execute("SELECT id,route,reason,escalation FROM v2_ai_decisions WHERE article_id <=> ? AND step_name=? AND input_fingerprint=? LIMIT 1", [articleId, decision.result.step, decision.result.inputFingerprint]);
  if (rows.length !== 1) throw new Error("ai_decision_persistence_failed");
  return { decisionId: Number(rows[0].id), operationKey: key, route: rows[0].route, reason: rows[0].reason, escalation: Boolean(rows[0].escalation), idempotent: Number(insert.affectedRows) === 0 };
}

module.exports = { persistDecision };
