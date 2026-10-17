"use strict";

function automaticPolicy(options = {}) {
  if (options.backfillExisting === true) return { clause: "", params: [] };
  if (Number.isSafeInteger(options.minArticleId) && options.minArticleId >= 0) {
    return { clause: " AND a.id>?", params: [options.minArticleId] };
  }
  throw new Error("image_rollout_cutoff_required");
}

function createImageRepository(pool) {
  return {
    async enqueueCompleted(limit = 100, options = {}) {
      const policy = automaticPolicy(options);
      const [result] = await pool.execute(
        `INSERT IGNORE INTO article_images (article_id)
         SELECT a.id FROM articles a WHERE a.status='done' AND a.processed=1${policy.clause} ORDER BY a.id ASC LIMIT ${Math.max(1, Math.min(500, Math.trunc(limit)))}`,
        policy.params,
      );
      return result.affectedRows;
    },
    async claim({ workerId, claimToken, staleMs, maxAttempts, articleId = null, minArticleId = null, backfillExisting = false }) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        let articleFilter;
        let articleParams;
        if (articleId != null) {
          articleFilter = " AND ai.article_id=?";
          articleParams = [articleId];
        } else {
          const policy = automaticPolicy({ minArticleId, backfillExisting });
          articleFilter = policy.clause ? " AND (a.id>? OR ai.force_revision>0)" : "";
          articleParams = policy.params;
        }
        const params = [Math.trunc(staleMs * 1000), maxAttempts];
        params.push(...articleParams);
        const [rows] = await connection.execute(
          `SELECT ai.article_id FROM article_images ai JOIN articles a ON a.id=ai.article_id
           WHERE a.status='done' AND a.processed=1 AND
             (ai.image_status='pending' OR (ai.image_status='generating' AND ai.heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND) OR
              (ai.image_status='failed' AND ai.retry_count <= ?))${articleFilter}
           ORDER BY ai.article_id ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
          params,
        );
        if (!rows.length) { await connection.commit(); return null; }
        const selectedArticleId = rows[0].article_id;
        await connection.execute(
          `UPDATE article_images SET image_status='generating', generation_status='in_progress', worker_id=?, claim_token=?,
             claimed_at=UTC_TIMESTAMP(6), heartbeat_at=UTC_TIMESTAMP(6), last_error_code=NULL, last_error_message=NULL
           WHERE article_id=?`, [workerId, claimToken, selectedArticleId],
        );
        await connection.commit();
        return { articleId: selectedArticleId, workerId, claimToken };
      } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    },
    async getAutomaticBacklogSummary(options = {}) {
      const policy = automaticPolicy(options);
      if (policy.clause) {
        const cutoff = policy.params[0];
        const [[row]] = await pool.execute(
          `SELECT
             SUM(a.status='done' AND a.processed=1 AND a.id<=?) historical_articles_excluded,
             SUM(a.status='done' AND a.processed=1 AND a.id>?) automatic_articles_eligible,
             (SELECT COUNT(*) FROM article_images ai JOIN articles pa ON pa.id=ai.article_id
               WHERE pa.status='done' AND pa.processed=1 AND (pa.id>? OR ai.force_revision>0) AND
                 (ai.image_status='pending' OR ai.image_status='generating' OR ai.image_status='failed')) pending_image_jobs
           FROM articles a`,
          [cutoff, cutoff, cutoff],
        );
        return {
          historicalArticlesExcluded: Number(row.historical_articles_excluded || 0),
          automaticArticlesEligible: Number(row.automatic_articles_eligible || 0),
          pendingImageJobs: Number(row.pending_image_jobs || 0),
        };
      }
      const [[row]] = await pool.execute(
        `SELECT
           SUM(a.status='done' AND a.processed=1) automatic_articles_eligible,
           (SELECT COUNT(*) FROM article_images ai JOIN articles pa ON pa.id=ai.article_id
             WHERE pa.status='done' AND pa.processed=1 AND
               (ai.image_status='pending' OR ai.image_status='generating' OR ai.image_status='failed')) pending_image_jobs
         FROM articles a`,
      );
      return {
        historicalArticlesExcluded: 0,
        automaticArticlesEligible: Number(row.automatic_articles_eligible || 0),
        pendingImageJobs: Number(row.pending_image_jobs || 0),
      };
    },
    async listSmokeCandidates(limit = 100) {
      const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
      const [rows] = await pool.execute(
        `SELECT a.id, a.title, a.short_summary, ai.image_status
         FROM articles a JOIN article_images ai ON ai.article_id=a.id
         WHERE a.status='done' AND a.processed=1 AND ai.image_status IN ('pending','failed','fallback')
         ORDER BY FIELD(ai.image_status,'failed','fallback','pending'), a.id ASC LIMIT ${safeLimit}`,
      );
      return rows;
    },
    async resetForSmoke(articleId) {
      const [result] = await pool.execute(
        `UPDATE article_images ai JOIN articles a ON a.id=ai.article_id
         SET ai.force_revision=ai.force_revision+1, ai.image_status='pending', ai.prompt_status='pending', ai.generation_status='pending',
           ai.worker_id=NULL, ai.claim_token=NULL, ai.claimed_at=NULL, ai.heartbeat_at=NULL, ai.retry_count=0,
           ai.last_error_code=NULL, ai.last_error_message=NULL
         WHERE ai.article_id=? AND a.status='done' AND a.processed=1 AND ai.image_status IN ('pending','failed','fallback')`,
        [articleId],
      );
      if (result.affectedRows !== 1) throw new Error("smoke_article_not_resettable");
    },
    async getImageState(articleId) {
      const [rows] = await pool.execute(
        `SELECT article_id, image_status, generation_status, source_type, storage_path, mime_type, width, height, byte_size, provider, model,
           last_error_code, last_error_message
         FROM article_images WHERE article_id=? LIMIT 1`, [articleId],
      );
      return rows[0] || null;
    },
    async load(claim) {
      const [rows] = await pool.execute(
        `SELECT a.id, a.title, a.short_summary, a.long_summary, a.category, a.cluster_id,
          ai.image_status, ai.fingerprint, ai.storage_path, ai.force_revision, ai.retry_count, ai.created_at image_created_at,
          (SELECT GROUP_CONCAT(k.keyword ORDER BY k.id SEPARATOR ',') FROM keywords k WHERE k.article_id=a.id) keywords,
          (SELECT GROUP_CONCAT(DISTINCT m.raw_text ORDER BY m.raw_text SEPARATOR ',') FROM v2_entity_mentions m
             WHERE m.article_id=a.id AND COALESCE(UPPER(m.entity_type),'') NOT IN ('PERSON','PER')) entities
         FROM articles a JOIN article_images ai ON ai.article_id=a.id
         WHERE a.id=? AND ai.worker_id=? AND ai.claim_token=? LIMIT 1`,
        [claim.articleId, claim.workerId, claim.claimToken],
      );
      if (!rows.length) throw new Error("image_claim_lost");
      return rows[0];
    },
    async heartbeat(claim) {
      const [result] = await pool.execute("UPDATE article_images SET heartbeat_at=UTC_TIMESTAMP(6) WHERE article_id=? AND image_status='generating' AND worker_id=? AND claim_token=?", [claim.articleId, claim.workerId, claim.claimToken]);
      if (result.affectedRows !== 1) throw new Error("image_claim_lost");
    },
    async reserveBudget({ provider, dailyBudget, amount }) {
      if (amount > dailyBudget) return false;
      // Seed the idempotent counter outside the reservation transaction. Keeping
      // concurrent INSERT IGNORE gap locks open while selecting the same row FOR
      // UPDATE can deadlock on an otherwise empty UTC-day bucket.
      await pool.execute("INSERT IGNORE INTO image_generation_daily_usage (usage_date, provider) VALUES (UTC_DATE(), ?)", [provider]);
      for (let retry = 0; retry < 3; retry += 1) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const [rows] = await connection.execute(
            "SELECT reserved_neurons FROM image_generation_daily_usage WHERE usage_date=UTC_DATE() AND provider=? FOR UPDATE", [provider],
          );
          const current = Number(rows[0]?.reserved_neurons || 0);
          if (!Number.isSafeInteger(current) || current < 0 || current + amount > dailyBudget) {
            await connection.rollback();
            return false;
          }
          await connection.execute(
            "UPDATE image_generation_daily_usage SET reserved_neurons=reserved_neurons+?, request_count=request_count+1 WHERE usage_date=UTC_DATE() AND provider=?",
            [amount, provider],
          );
          await connection.commit();
          return true;
        } catch (error) {
          await connection.rollback();
          if (error?.code !== "ER_LOCK_DEADLOCK" || retry === 2) throw error;
        } finally { connection.release(); }
      }
      return false;
    },
    async releaseRejectedBudget({ provider, amount }) {
      const [result] = await pool.execute(
        `UPDATE image_generation_daily_usage SET reserved_neurons=reserved_neurons-?
         WHERE usage_date=UTC_DATE() AND provider=? AND reserved_neurons>=?`,
        [amount, provider, amount],
      );
      if (result.affectedRows !== 1) throw new Error("image_budget_release_failed");
    },
    async findClusterReady(article, criteria) {
      if (!article.cluster_id) return null;
      const [rows] = await pool.execute(
        `SELECT ai.article_id, ai.fingerprint, ai.storage_path, ai.mime_type, ai.width, ai.height, ai.byte_size
         FROM articles a JOIN article_images ai ON ai.article_id=a.id
         WHERE a.cluster_id=? AND a.id<>? AND ai.image_status='ready' AND ai.storage_path IS NOT NULL
           AND ai.source_type IN ('generated','cluster_reuse') AND ai.provider=? AND ai.model=? AND ai.prompt_version=?
         ORDER BY ai.generated_at DESC, ai.article_id DESC LIMIT 1`,
        [article.cluster_id, article.id, criteria.provider, criteria.model, criteria.promptVersion],
      );
      return rows[0] || null;
    },
    async savePrompt(claim, details) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
          `UPDATE article_images SET prompt_status='done', policy_action=?, prompt_version=?, prompt_text=?, fingerprint=?, provider=?, model=?, storage_path=NULL
           WHERE article_id=? AND image_status='generating' AND worker_id=? AND claim_token=?`,
          [details.policyAction, details.promptVersion, details.prompt, details.fingerprint, details.provider, details.model,
            claim.articleId, claim.workerId, claim.claimToken],
        );
        if (result.affectedRows !== 1) throw new Error("image_claim_lost");
        await connection.execute(
          `INSERT INTO article_processing_steps (article_id, step_name, status, attempt_count, completed_at, result_json)
           VALUES (?, 'image_prompt', 'done', 1, UTC_TIMESTAMP(6), ?)
           ON DUPLICATE KEY UPDATE status='done', attempt_count=attempt_count+1, completed_at=UTC_TIMESTAMP(6), result_json=VALUES(result_json), last_error=NULL`,
          [claim.articleId, JSON.stringify({ promptVersion: details.promptVersion, fingerprint: details.fingerprint, policyAction: details.policyAction })],
        );
        await connection.commit();
      } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    },
    async complete(claim, details) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
          `UPDATE article_images SET image_status=?, generation_status=?, source_type=?, reused_from_article_id=?, fallback_type=?, storage_path=?, mime_type=?, width=?, height=?, byte_size=?,
             retry_count=?, generated_at=IF(?='ready',UTC_TIMESTAMP(6),generated_at), worker_id=NULL, claim_token=NULL, claimed_at=NULL, heartbeat_at=NULL,
             last_error_code=?, last_error_message=?
           WHERE article_id=? AND image_status='generating' AND worker_id=? AND claim_token=?`,
          [details.imageStatus, details.generationStatus, details.sourceType || null, details.reusedFromArticleId || null, details.fallbackType || null, details.storagePath || null,
            details.mimeType || null, details.width || null, details.height || null, details.byteSize || null, details.retryCount || 0,
            details.imageStatus, details.errorCode || null, details.errorMessage || null, claim.articleId, claim.workerId, claim.claimToken],
        );
        if (result.affectedRows !== 1) throw new Error("image_claim_lost");
        await connection.execute(
          `INSERT INTO article_processing_steps (article_id, step_name, status, attempt_count, completed_at, result_json, last_error)
           VALUES (?, 'image_generate', ?, ?, UTC_TIMESTAMP(6), ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), attempt_count=attempt_count+VALUES(attempt_count), completed_at=UTC_TIMESTAMP(6), result_json=VALUES(result_json), last_error=VALUES(last_error)`,
          [claim.articleId, details.generationStatus === "failed" ? "failed" : details.generationStatus === "skipped" ? "skipped" : "done",
            Math.max(1, details.retryCount + 1), JSON.stringify({ sourceType: details.sourceType, storagePath: details.storagePath, fallbackType: details.fallbackType }), details.errorMessage || null],
        );
        await connection.commit();
      } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    },
  };
}

module.exports = { createImageRepository };
