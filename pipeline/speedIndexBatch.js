"use strict";

const { randomUUID } = require("node:crypto");
const { updateSpeedIndex } = require("./updateSpeedIndex");

const SPEED_INDEX_SCOPE = "utc-day-global:v1";
const DEFAULT_STALE_MS = 15 * 60 * 1000;

function emit(logger, event) {
  if (typeof logger === "function") logger(event);
}

async function markSpeedIndexDirty(executor, options = {}) {
  const [result] = await executor.execute(
    `INSERT INTO speed_index_recalculation_jobs
       (scope_key,generation,completed_generation,status,created_at,updated_at)
     VALUES (?,1,0,'pending',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE
       generation=generation+1,
       status=IF(status='in_progress','in_progress','pending'),
       last_error=NULL,
       updated_at=UTC_TIMESTAMP(6)`,
    [options.scopeKey || SPEED_INDEX_SCOPE],
  );
  emit(options.logger, { event: result.affectedRows === 1 ? "speed_index_dirty" : "speed_index_dirty_advanced", scope: options.scopeKey || SPEED_INDEX_SCOPE });
  return { scheduled: true, scope: options.scopeKey || SPEED_INDEX_SCOPE };
}

async function claimSpeedIndexBatch(executor, options = {}) {
  const scopeKey = options.scopeKey || SPEED_INDEX_SCOPE;
  const workerId = options.workerId || `speed-${process.pid}`;
  const claimToken = randomUUID();
  const staleMicros = Math.trunc((options.staleMs || DEFAULT_STALE_MS) * 1000);
  const [result] = await executor.execute(
    `UPDATE speed_index_recalculation_jobs
     SET status='in_progress',worker_id=?,claim_token=?,claimed_generation=generation,
         claimed_at=UTC_TIMESTAMP(6),heartbeat_at=UTC_TIMESTAMP(6),last_error=NULL
     WHERE scope_key=? AND generation>completed_generation
       AND (status IN ('pending','failed') OR (status='in_progress' AND heartbeat_at < UTC_TIMESTAMP(6)-INTERVAL ? MICROSECOND))`,
    [workerId, claimToken, scopeKey, staleMicros],
  );
  if (result.affectedRows !== 1) return null;
  const [[row]] = await executor.execute(
    "SELECT claimed_generation,generation FROM speed_index_recalculation_jobs WHERE scope_key=? AND claim_token=?",
    [scopeKey, claimToken],
  );
  const claim = { scopeKey, workerId, claimToken, claimedGeneration: Number(row.claimed_generation), generation: Number(row.generation) };
  emit(options.logger, { event: "speed_index_batch_claimed", ...claim, claimToken: undefined });
  return claim;
}

async function failClaim(executor, claim, error, logger) {
  await executor.execute(
    `UPDATE speed_index_recalculation_jobs SET status='failed',worker_id=NULL,claim_token=NULL,
       claimed_generation=NULL,claimed_at=NULL,heartbeat_at=NULL,last_error=?,updated_at=UTC_TIMESTAMP(6)
     WHERE scope_key=? AND claim_token=? AND status='in_progress'`,
    [String(error?.message || error).slice(0, 1000), claim.scopeKey, claim.claimToken],
  );
  emit(logger, { event: "speed_index_batch_failed", scope: claim.scopeKey, generation: claim.claimedGeneration, error: String(error?.message || error) });
}

async function runPendingSpeedIndexBatch(pool, options = {}) {
  const claim = await claimSpeedIndexBatch(pool, options);
  if (!claim) return { claimed: false };
  const connection = await pool.getConnection();
  const startedAt = Date.now();
  try {
    await connection.beginTransaction();
    const [[owned]] = await connection.execute(
      `SELECT 1 owned FROM speed_index_recalculation_jobs
       WHERE scope_key=? AND status='in_progress' AND claim_token=? AND claimed_generation=?`,
      [claim.scopeKey, claim.claimToken, claim.claimedGeneration],
    );
    if (!owned) throw new Error("speed_index_batch_claim_lost");
    emit(options.logger, { event: "speed_index_recalculation_started", scope: claim.scopeKey, generation: claim.claimedGeneration });
    const calculation = await updateSpeedIndex({ connection, strict: true, instrumentation: options.instrumentation, hooks: options.calculationHooks });
    if (options.beforeComplete) await options.beforeComplete({ connection, claim, calculation });
    const [completed] = await connection.execute(
      `UPDATE speed_index_recalculation_jobs
       SET completed_generation=?,status=IF(generation>?,'pending','clean'),run_count=run_count+1,
           worker_id=NULL,claim_token=NULL,claimed_generation=NULL,claimed_at=NULL,heartbeat_at=NULL,
           last_error=NULL,last_completed_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6)
       WHERE scope_key=? AND status='in_progress' AND claim_token=? AND claimed_generation=?`,
      [claim.claimedGeneration, claim.claimedGeneration, claim.scopeKey, claim.claimToken, claim.claimedGeneration],
    );
    if (completed.affectedRows !== 1) throw new Error("speed_index_batch_completion_fenced");
    await connection.commit();
    const result = { claimed: true, completed: true, claimedGeneration: claim.claimedGeneration, calculation, runtimeMs: Date.now() - startedAt };
    emit(options.logger, { event: "speed_index_batch_completed", scope: claim.scopeKey, generation: claim.claimedGeneration, runtimeMs: result.runtimeMs });
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch {}
    await failClaim(pool, claim, error, options.logger);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { SPEED_INDEX_SCOPE, markSpeedIndexDirty, claimSpeedIndexBatch, runPendingSpeedIndexBatch };
