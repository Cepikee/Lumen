"use strict";

const { persistDecision } = require("./ai-cost-router-repository");
const { STEP_NAME } = require("./incremental-backfill");

function requireConnection(connection) { if (!connection || typeof connection["execute"] !== "function") throw new TypeError("connection_required"); }
function createIncrementalBackfillRepository(connection) {
  requireConnection(connection);
  const repo = {
    async withTransaction(work) {
      const transactional = typeof connection.getConnection === "function";
      const txConnection = transactional ? await connection.getConnection() : connection;
      const txRepo = transactional ? createIncrementalBackfillRepository(txConnection) : repo;
      if (typeof txConnection.beginTransaction !== "function") {
        if (transactional && typeof txConnection.release === "function") txConnection.release();
        return work(txRepo);
      }
      let lastError;
      try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          await txConnection.beginTransaction();
          try {
            const result = await work(txRepo);
            await txConnection.commit();
            return result;
          } catch (error) {
            lastError = error;
            try { await txConnection.rollback(); } catch {}
            const retryable = error?.code === "ER_LOCK_DEADLOCK" || error?.code === "ER_LOCK_WAIT_TIMEOUT" || Number(error?.errno) === 1213 || Number(error?.errno) === 1205;
            if (!retryable || attempt === 1) throw error;
          }
        }
        throw lastError;
      } finally {
        if (transactional && typeof txConnection.release === "function") txConnection.release();
      }
    },
    async listArticlesAfter(cursor, limit) {
      const [rows] = await connection["execute"]("SELECT id,content_hash contentHash,content_text contentText,updated_at updatedAt FROM articles WHERE id>? ORDER BY id ASC LIMIT ?", [cursor, limit]);
      return rows;
    },
    async claimStep({ articleId, stepName = STEP_NAME, inputFingerprint, claimToken }) {
      const [rows] = await connection["execute"]("SELECT status,heartbeat_at heartbeatAt,output_ref outputRef,(heartbeat_at IS NOT NULL AND heartbeat_at >= UTC_TIMESTAMP(6)-INTERVAL 5 MINUTE) freshHeartbeat FROM v2_processing_steps WHERE article_id=? AND step_name=? AND input_fingerprint=? FOR UPDATE", [articleId, stepName, inputFingerprint]);
      if (rows.length && rows[0].status === "completed") return { status: "completed", outputRef: rows[0].outputRef };
      if (rows.length && rows[0].status === "processing" && Number(rows[0].freshHeartbeat) === 1) return { status: "busy" };
      if (!rows.length) await connection["execute"]("INSERT INTO v2_processing_steps (article_id,step_name,input_fingerprint,status,attempt,claim_token,heartbeat_at,created_at,updated_at) VALUES (?,?,?,'processing',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [articleId, stepName, inputFingerprint, claimToken]);
      else await connection["execute"]("UPDATE v2_processing_steps SET status='processing',attempt=attempt+1,claim_token=?,heartbeat_at=UTC_TIMESTAMP(6),error_metadata=NULL,updated_at=UTC_TIMESTAMP(6) WHERE article_id=? AND step_name=? AND input_fingerprint=?", [claimToken, articleId, stepName, inputFingerprint]);
      return { status: "claimed", claimToken };
    },
    async completeStep({ articleId, stepName = STEP_NAME, inputFingerprint, claimToken, outputRef = null }) {
      const [result] = await connection["execute"]("UPDATE v2_processing_steps SET status='completed',output_ref=?,completed_at=UTC_TIMESTAMP(6),heartbeat_at=NULL,updated_at=UTC_TIMESTAMP(6) WHERE article_id=? AND step_name=? AND input_fingerprint=? AND claim_token=?", [outputRef, articleId, stepName, inputFingerprint, claimToken]);
      if (Number(result.affectedRows) !== 1) throw new Error("backfill_claim_lost");
    },
    async persistDecision(input) { return persistDecision(connection, input); },
  };
  return repo;
}

module.exports = { createIncrementalBackfillRepository };
