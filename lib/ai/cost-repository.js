"use strict";

const { tokenCostMicros } = require("./cost-config");

class AiBudgetExhaustedError extends Error {
  constructor(scope) {
    super(`ai_budget_exhausted:${scope}`);
    this.name = "AiBudgetExhaustedError";
    this.code = "AI_BUDGET_EXHAUSTED";
    this.scope = scope;
  }
}

class AiOperationBlockedError extends Error {
  constructor(status) {
    super(`ai_operation_not_retryable:${status}`);
    this.name = "AiOperationBlockedError";
    this.code = "AI_OPERATION_NOT_RETRYABLE";
    this.status = status;
  }
}

function asSafeNumber(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`ai_cost_${field}_invalid`);
  return number;
}

async function rollbackQuietly(connection) {
  try { await connection.rollback(); } catch { /* preserve the original failure */ }
}

function createMysqlAiCostRepository(pool) {
  if (!pool?.getConnection) throw new TypeError("ai_cost_pool_required");

  return {
    async reserve(spec) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const scopes = [
          ["daily", `${spec.pilotId}:${spec.usageDate}`, spec.limits.dailyMicros],
          ["monthly", `${spec.pilotId}:${spec.usageMonth}`, spec.limits.monthlyMicros],
          ["pilot", spec.pilotId, spec.limits.pilotMicros],
        ];
        for (const [type, key, limit] of scopes) {
          await connection.execute(
            "INSERT IGNORE INTO ai_cost_budget_scopes (scope_type, scope_key, limit_micros) VALUES (?, ?, ?)",
            [type, key, limit],
          );
        }
        const lockedScopes = [];
        for (const [type, key, configuredLimit] of scopes) {
          const [rows] = await connection.execute(
            "SELECT limit_micros, reserved_micros, actual_micros FROM ai_cost_budget_scopes WHERE scope_type=? AND scope_key=? FOR UPDATE",
            [type, key],
          );
          if (rows.length !== 1) throw new Error(`ai_cost_scope_missing:${type}`);
          const limit = asSafeNumber(rows[0].limit_micros, "scope_limit");
          if (limit !== configuredLimit) throw new Error(`ai_cost_scope_limit_mismatch:${type}`);
          lockedScopes.push({ type, key, limit, reserved: asSafeNumber(rows[0].reserved_micros, "scope_reserved"), actual: asSafeNumber(rows[0].actual_micros, "scope_actual") });
        }
        const [existing] = await connection.execute(
          "SELECT status, reserved_cost_micros FROM ai_cost_operations WHERE operation_key=? FOR UPDATE",
          [spec.operationKey],
        );
        if (existing.length) {
          const status = String(existing[0].status);
          if (status === "reserved") {
            await connection.commit();
            return { ...spec, reservedCostMicros: asSafeNumber(existing[0].reserved_cost_micros, "existing_reservation"), reused: true };
          }
          throw new AiOperationBlockedError(status);
        }
        for (const scope of lockedScopes) {
          if (scope.actual + scope.reserved + spec.reservedCostMicros > scope.limit) throw new AiBudgetExhaustedError(scope.type);
        }
        await connection.execute(
          `INSERT INTO ai_cost_operations
           (operation_key,pilot_id,article_id,step_name,provider,model,call_kind,status,usage_date,usage_month,
            estimated_input_tokens,reserved_output_tokens,input_price_micros_per_million,output_price_micros_per_million,
            safety_multiplier_millis,reserved_cost_micros,pricing_version)
           VALUES (?,?,?,?,?,?,?,'reserved',?,?,?,?,?,?,?,?,?)`,
          [spec.operationKey, spec.pilotId, spec.articleId, spec.stepName, spec.provider, spec.model, spec.kind,
            spec.usageDate, spec.usageMonth, spec.estimatedInputTokens, spec.reservedOutputTokens,
            spec.price.inputMicrosPerMillion, spec.price.outputMicrosPerMillion, spec.safetyMultiplierMillis,
            spec.reservedCostMicros, spec.pricingVersion],
        );
        for (const scope of lockedScopes) {
          await connection.execute(
            "UPDATE ai_cost_budget_scopes SET reserved_micros=reserved_micros+?, request_count=request_count+1 WHERE scope_type=? AND scope_key=?",
            [spec.reservedCostMicros, scope.type, scope.key],
          );
        }
        await connection.commit();
        return { ...spec, reused: false };
      } catch (error) {
        await rollbackQuietly(connection);
        throw error;
      } finally {
        connection.release();
      }
    },

    async markStarted(operationKey) {
      const [result] = await pool.execute(
        "UPDATE ai_cost_operations SET status='started', started_at=UTC_TIMESTAMP(6) WHERE operation_key=? AND status='reserved'",
        [operationKey],
      );
      if (result.affectedRows === 1) return true;
      const [rows] = await pool.execute("SELECT status FROM ai_cost_operations WHERE operation_key=? LIMIT 1", [operationKey]);
      throw new AiOperationBlockedError(rows[0]?.status || "missing");
    },

    async complete(operationKey, usage) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [operations] = await connection.execute("SELECT *, DATE_FORMAT(usage_date,'%Y-%m-%d') AS usage_date_text FROM ai_cost_operations WHERE operation_key=? FOR UPDATE", [operationKey]);
        const operation = operations[0];
        if (!operation || operation.status !== "started") throw new AiOperationBlockedError(operation?.status || "missing");
        const inputTokens = asSafeNumber(usage.inputTokens, "actual_input_tokens");
        const outputTokens = asSafeNumber(usage.outputTokens, "actual_output_tokens");
        const actualCostMicros = tokenCostMicros(inputTokens, outputTokens, {
          inputMicrosPerMillion: asSafeNumber(operation.input_price_micros_per_million, "input_price"),
          outputMicrosPerMillion: asSafeNumber(operation.output_price_micros_per_million, "output_price"),
        });
        const reservedCostMicros = asSafeNumber(operation.reserved_cost_micros, "reserved_cost");
        if (actualCostMicros > reservedCostMicros) throw new Error("ai_cost_actual_exceeds_reservation");
        const scopeKeys = [["daily", `${operation.pilot_id}:${operation.usage_date_text}`], ["monthly", `${operation.pilot_id}:${operation.usage_month}`], ["pilot", operation.pilot_id]];
        for (const [type, key] of scopeKeys) {
          const [rows] = await connection.execute("SELECT reserved_micros FROM ai_cost_budget_scopes WHERE scope_type=? AND scope_key=? FOR UPDATE", [type, key]);
          if (rows.length !== 1 || asSafeNumber(rows[0].reserved_micros, "scope_reserved") < reservedCostMicros) throw new Error(`ai_cost_scope_reservation_missing:${type}`);
        }
        for (const [type, key] of scopeKeys) {
          await connection.execute(
            "UPDATE ai_cost_budget_scopes SET reserved_micros=reserved_micros-?, actual_micros=actual_micros+? WHERE scope_type=? AND scope_key=?",
            [reservedCostMicros, actualCostMicros, type, key],
          );
        }
        await connection.execute(
          `UPDATE ai_cost_operations SET status='completed', actual_input_tokens=?, actual_output_tokens=?, actual_cost_micros=?,
           provider_reported_cost_micros=?, completed_at=UTC_TIMESTAMP(6), last_error=NULL WHERE operation_key=?`,
          [inputTokens, outputTokens, actualCostMicros, usage.providerReportedCostMicros ?? null, operationKey],
        );
        await connection.commit();
        return { actualCostMicros, reservedCostMicros };
      } catch (error) {
        await rollbackQuietly(connection);
        throw error;
      } finally {
        connection.release();
      }
    },

    async markUncertain(operationKey, error) {
      const [result] = await pool.execute(
        "UPDATE ai_cost_operations SET status='uncertain', last_error=? WHERE operation_key=? AND status='started'",
        [String(error instanceof Error ? error.message : error).slice(0, 1000), operationKey],
      );
      return result.affectedRows === 1;
    },

    async status(pilotId) {
      const [scopes] = await pool.execute(
        "SELECT scope_type,scope_key,limit_micros,reserved_micros,actual_micros,request_count FROM ai_cost_budget_scopes WHERE scope_key=? OR scope_key LIKE ? ORDER BY scope_type,scope_key",
        [pilotId, `${pilotId}:%`],
      );
      const [rows] = await pool.execute(
        `SELECT COUNT(*) AS ai_calls, COUNT(DISTINCT article_id) AS articles, status,
          COALESCE(SUM(reserved_cost_micros),0) AS reserved_cost_micros,
          COALESCE(SUM(actual_cost_micros),0) AS actual_cost_micros,
          COALESCE(SUM(actual_input_tokens),0) AS input_tokens,
          COALESCE(SUM(actual_output_tokens),0) AS output_tokens
         FROM ai_cost_operations WHERE pilot_id=? GROUP BY status ORDER BY status`,
        [pilotId],
      );
      const [[totals]] = await pool.execute(
        `SELECT COUNT(*) AS ai_calls, COUNT(DISTINCT o.article_id) AS articles,
          COUNT(DISTINCT CASE WHEN a.status='done' THEN o.article_id END) AS processed_articles,
          SUM(o.status='completed') AS completed_calls, SUM(o.status='uncertain') AS uncertain_calls,
          COALESCE(SUM(o.actual_input_tokens),0) AS input_tokens,
          COALESCE(SUM(o.actual_output_tokens),0) AS output_tokens,
          COALESCE(SUM(o.actual_cost_micros),0) AS actual_cost_micros
         FROM ai_cost_operations o JOIN articles a ON a.id=o.article_id WHERE o.pilot_id=?`,
        [pilotId],
      );
      return { pilotId, scopes, operations: rows, totals };
    },
  };
}

module.exports = { AiBudgetExhaustedError, AiOperationBlockedError, createMysqlAiCostRepository };
