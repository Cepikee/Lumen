"use strict";

const DEFAULT_SLOW_DB_MS = 250;
const DEFAULT_CRITICAL_DB_MS = 1000;
const state = { dbOperations: 0, dbFailures: 0, slowDbOperations: 0, criticalDbOperations: 0, lastDurationMs: null };

function threshold(name, fallback, env = process.env) {
  const value = Number(env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getObservabilitySnapshot() {
  return { db: { ...state } };
}

async function observeDbOperation(operation, metadata = {}, options = {}) {
  if (typeof operation !== "function") throw new TypeError("operation_required");
  const started = process.hrtime.bigint();
  state.dbOperations += 1;
  try {
    return await operation();
  } catch (error) {
    state.dbFailures += 1;
    throw error;
  } finally {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    state.lastDurationMs = Number(durationMs.toFixed(3));
    const slowMs = threshold("UTOM_DB_SLOW_WARNING_MS", DEFAULT_SLOW_DB_MS, options.env);
    const criticalMs = threshold("UTOM_DB_SLOW_CRITICAL_MS", DEFAULT_CRITICAL_DB_MS, options.env);
    if (durationMs >= slowMs) {
      state.slowDbOperations += 1;
      if (durationMs >= criticalMs) state.criticalDbOperations += 1;
      const logger = options.logger || console;
      logger.warn(JSON.stringify({ event: "db_operation_slow", operation: String(metadata.operation || "unknown").slice(0, 64), durationMs: state.lastDurationMs, severity: durationMs >= criticalMs ? "critical" : "warning" }));
    }
  }
}

module.exports = { DEFAULT_SLOW_DB_MS, DEFAULT_CRITICAL_DB_MS, observeDbOperation, getObservabilitySnapshot };
