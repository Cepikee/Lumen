"use strict";

const { createHash, randomUUID } = require("node:crypto");

const SHADOW_STEP = "v2.shadow_intelligence";

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function inputFingerprint(article) {
  return hash(JSON.stringify([
    SHADOW_STEP,
    "1",
    Number(article.id),
    article.contentHash || null,
    article.urlCanonical,
    article.updatedAt instanceof Date ? article.updatedAt.toISOString() : article.updatedAt || null,
  ]));
}

function createShadowIntelligenceRepository(pool) {
  if (!pool || typeof pool.execute !== "function" || typeof pool.getConnection !== "function") {
    throw new TypeError("pool_required");
  }

  return {
    async loadCompletedArticle(articleId) {
      const [rows] = await pool.execute(
        `SELECT id,title,url_canonical urlCanonical,content_text contentText,content_hash contentHash,
                source_id sourceId,source,published_at publishedAt,updated_at updatedAt,status,processed
           FROM articles WHERE id=? LIMIT 1`,
        [Number(articleId)],
      );
      return rows[0] || null;
    },

    async claim(article) {
      const fingerprint = inputFingerprint(article);
      const claimToken = randomUUID();
      const [insert] = await pool.execute(
        `INSERT IGNORE INTO v2_processing_steps
          (article_id,step_name,input_fingerprint,status,attempt,claim_token,heartbeat_at,created_at,updated_at)
         VALUES (?,? ,?,'processing',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
        [Number(article.id), SHADOW_STEP, fingerprint, claimToken],
      );
      if (Number(insert.affectedRows) === 1) return { status: "claimed", fingerprint, claimToken };

      const [rows] = await pool.execute(
        `SELECT status,output_ref outputRef,
                (heartbeat_at IS NOT NULL AND heartbeat_at >= UTC_TIMESTAMP(6)-INTERVAL 5 MINUTE) freshHeartbeat
           FROM v2_processing_steps
          WHERE article_id=? AND step_name=? AND input_fingerprint=? LIMIT 1`,
        [Number(article.id), SHADOW_STEP, fingerprint],
      );
      const current = rows[0];
      if (current?.status === "completed") return { status: "completed", fingerprint, outputRef: current.outputRef || null };
      if (current?.status === "processing" && Number(current.freshHeartbeat) === 1) return { status: "busy", fingerprint };

      const [update] = await pool.execute(
        `UPDATE v2_processing_steps
            SET status='processing',attempt=attempt+1,claim_token=?,heartbeat_at=UTC_TIMESTAMP(6),
                output_ref=NULL,error_metadata=NULL,completed_at=NULL,updated_at=UTC_TIMESTAMP(6)
          WHERE article_id=? AND step_name=? AND input_fingerprint=?
            AND (status='failed' OR heartbeat_at IS NULL OR heartbeat_at < UTC_TIMESTAMP(6)-INTERVAL 5 MINUTE)`,
        [claimToken, Number(article.id), SHADOW_STEP, fingerprint],
      );
      return Number(update.affectedRows) === 1
        ? { status: "claimed", fingerprint, claimToken }
        : { status: "busy", fingerprint };
    },

    async complete({ articleId, fingerprint, claimToken, outputRef }) {
      const [result] = await pool.execute(
        `UPDATE v2_processing_steps
            SET status='completed',output_ref=?,error_metadata=NULL,completed_at=UTC_TIMESTAMP(6),
                heartbeat_at=NULL,updated_at=UTC_TIMESTAMP(6)
          WHERE article_id=? AND step_name=? AND input_fingerprint=? AND status='processing' AND claim_token=?`,
        [outputRef || null, Number(articleId), SHADOW_STEP, fingerprint, claimToken],
      );
      if (Number(result.affectedRows) !== 1) throw new Error("v2_shadow_claim_lost");
    },

    async fail({ articleId, fingerprint, claimToken, error }) {
      const safeError = JSON.stringify({ message: String(error?.message || error).slice(0, 500) });
      await pool.execute(
        `UPDATE v2_processing_steps
            SET status='failed',error_metadata=?,heartbeat_at=NULL,updated_at=UTC_TIMESTAMP(6)
          WHERE article_id=? AND step_name=? AND input_fingerprint=? AND status='processing' AND claim_token=?`,
        [safeError, Number(articleId), SHADOW_STEP, fingerprint, claimToken],
      );
    },

    async withTransaction(work) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
      } finally {
        connection.release();
      }
    },

    async withConnection(work) {
      const connection = await pool.getConnection();
      try {
        return await work(connection);
      } finally {
        connection.release();
      }
    },
  };
}

module.exports = { SHADOW_STEP, createShadowIntelligenceRepository, inputFingerprint };
