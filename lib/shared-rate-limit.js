"use strict";

const crypto = require("node:crypto");

function normalizeKey(scope, identity) {
  const value = `${String(scope).slice(0, 64)}:${String(identity).slice(0, 256)}`;
  return `${String(scope).replace(/[^a-z0-9:_-]/gi, "_").slice(0, 64)}:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

async function consumeRateLimit(pool, { scope = "api", identity, limit = 60, windowMs = 10_000, nowMs }) {
  if (!identity || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1000) throw new Error("invalid_rate_limit_configuration");
  const key = normalizeKey(scope, identity);
  const connection = await pool.getConnection();
  try {
    let effectiveNowMs = nowMs;
    if (effectiveNowMs === undefined) {
      const [[clock]] = await connection.query("SELECT CAST(UNIX_TIMESTAMP(UTC_TIMESTAMP(6))*1000 AS UNSIGNED) now_ms");
      effectiveNowMs = Number(clock.now_ms);
    }
    if (!Number.isSafeInteger(effectiveNowMs) || effectiveNowMs < 0) throw new Error("invalid_rate_limit_clock");
    const windowStartMs = Math.floor(effectiveNowMs / windowMs) * windowMs;
    const expiresAt = new Date(windowStartMs + windowMs);
    await connection.query("SELECT LAST_INSERT_ID(0)");
    const [result] = await connection.execute(
      `INSERT INTO shared_rate_limits(bucket_key,window_start_ms,accepted_count,total_count,expires_at) VALUES (?,?,1,1,?)
       ON DUPLICATE KEY UPDATE total_count=total_count+1,
       accepted_count=IF(accepted_count < ?,LAST_INSERT_ID(accepted_count+1),accepted_count+LAST_INSERT_ID(0)),expires_at=VALUES(expires_at)`,
      [key, windowStartMs, expiresAt, limit],
    );
    const accepted = result.affectedRows === 1 || Number(result.insertId) > 0;
    return { accepted, key, windowStartMs, expiresAt };
  } finally { connection.release(); }
}

async function cleanupExpiredRateLimits(pool, batchSize = 500) {
  const safeLimit = Math.min(5000, Math.max(1, Math.trunc(batchSize)));
  const [result] = await pool.query(`DELETE FROM shared_rate_limits WHERE expires_at < UTC_TIMESTAMP(6) LIMIT ${safeLimit}`);
  return Number(result.affectedRows || 0);
}

async function consumeRateLimitFailClosed(pool, options) {
  try { return (await consumeRateLimit(pool, options)).accepted; }
  catch { return false; }
}

module.exports = { normalizeKey, consumeRateLimit, consumeRateLimitFailClosed, cleanupExpiredRateLimits };
