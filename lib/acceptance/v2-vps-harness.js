"use strict";

const crypto = require("node:crypto");

const ACCEPTANCE_DB_PATTERN = /^utom_acceptance_[a-z0-9_]+$/;
const PRODUCTION_READ_STATEMENTS = new Set(["SELECT", "SHOW", "DESCRIBE", "EXPLAIN"]);

function firstStatementToken(sql) {
  const normalized = String(sql || "")
    .replace(/^\s*(?:--[^\n]*(?:\n|$)|#[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/\s*)*/u, "")
    .trim();
  return (normalized.match(/^([A-Za-z]+)/u)?.[1] || "").toUpperCase();
}

function assertProductionReadSql(sql) {
  const source = String(sql || "");
  const token = firstStatementToken(sql);
  if (!PRODUCTION_READ_STATEMENTS.has(token)) throw new Error(`production_write_rejected:${token || "unknown"}`);
  const withoutComments = source.replace(/--[^\n]*(?:\n|$)|#[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\//gu, " ").trim();
  if (/;\s*\S/u.test(withoutComments) || /\b(?:INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|TRUNCATE|CALL|LOAD|GRANT|REVOKE|LOCK|UNLOCK|HANDLER|DO|SET)\b/iu.test(withoutComments)
    || /\bINTO\s+(?:OUTFILE|DUMPFILE)\b/iu.test(withoutComments) || /\bFOR\s+UPDATE\b/iu.test(withoutComments)) {
    throw new Error("production_write_rejected:unsafe_read_shape");
  }
  return token;
}

function assertAcceptanceDatabaseName(name) {
  const value = String(name || "");
  if (!ACCEPTANCE_DB_PATTERN.test(value)) throw new Error("unsafe_acceptance_database_name");
  return value;
}

function assertAcceptanceOptIn(env = process.env, databaseName) {
  if (String(env.UTOM_ACCEPTANCE_RUN || "").toLowerCase() !== "true") throw new Error("acceptance_opt_in_required");
  return assertAcceptanceDatabaseName(databaseName);
}

function createProductionReadAdapter(connection, counters = {}) {
  if (!connection || typeof connection.query !== "function" || typeof connection.execute !== "function") throw new TypeError("connection_required");
  counters.attempted = Number(counters.attempted || 0);
  counters.executed = Number(counters.executed || 0);
  counters.mutatingAttempts = Number(counters.mutatingAttempts || 0);
  const call = (method) => async (sql, params) => {
    counters.attempted += 1;
    try { assertProductionReadSql(sql); } catch (error) { counters.mutatingAttempts += 1; throw error; }
    const result = await connection[method](sql, params);
    counters.executed += 1;
    return result;
  };
  return Object.freeze({ query: call("query"), execute: call("execute") });
}

function createAcceptanceDatabaseController(connection, { env = process.env, databaseName } = {}) {
  const safeName = assertAcceptanceOptIn(env, databaseName);
  if (!connection || typeof connection.query !== "function") throw new TypeError("connection_required");
  return Object.freeze({
    async create() { return connection.query(`CREATE DATABASE \`${safeName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`); },
    async drop() { assertAcceptanceDatabaseName(safeName); return connection.query(`DROP DATABASE IF EXISTS \`${safeName}\``); },
  });
}

function parseArticleIds(value) {
  const parts = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (parts.length < 3 || parts.some((item) => !/^[1-9][0-9]*$/u.test(item))) throw new Error("at_least_three_valid_article_ids_required");
  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id))) throw new Error("article_id_out_of_range");
  if (new Set(ids).size !== ids.length) throw new Error("duplicate_article_ids_rejected");
  return ids;
}

function validateArticleFixtures(rows, requestedIds) {
  if (!Array.isArray(rows) || rows.length !== requestedIds.length) throw new Error("selected_article_missing");
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  for (const articleId of requestedIds) {
    const row = byId.get(articleId);
    if (!row) throw new Error(`selected_article_missing:${articleId}`);
    if (!String(row.contentText || "").trim()) throw new Error(`selected_article_text_missing:${articleId}`);
    if (!String(row.urlCanonical || "").trim()) throw new Error(`selected_article_canonical_url_missing:${articleId}`);
    if (String(row.status || "") !== "done" || Number(row.processed) !== 1) throw new Error(`selected_article_not_completed:${articleId}`);
    if (!Number.isSafeInteger(Number(row.sourceId)) || Number(row.sourceId) < 1 || !String(row.sourceSlug || "").trim()) throw new Error(`selected_article_canonical_source_missing:${articleId}`);
  }
  const sources = new Set(rows.map((row) => Number(row.sourceId)));
  if (sources.size < 3) throw new Error("three_distinct_canonical_sources_required");
  return rows;
}

function buildRunId(now = new Date(), random = crypto.randomBytes(4).toString("hex")) {
  return `${now.toISOString().replace(/[-:.TZ]/gu, "").slice(0, 14)}_${String(random).toLowerCase().replace(/[^a-z0-9]/gu, "").slice(0, 16)}`;
}

function classifyAcceptanceResult({ articles = [], match = null, comparison = null, conflicts = [], safety = {} } = {}) {
  if (safety.productionWritesExecuted > 0 || safety.externalProviderCalls > 0 || safety.paidAiCalls > 0 || safety.provenanceValid === false || safety.timelineValid === false || safety.conflictValid === false) return { verdict: "FAIL", category: "SYSTEM ERROR", reason: "safety_gate_failed" };
  if (articles.some((item) => item.status === "failed")) return { verdict: "FAIL", category: "SYSTEM ERROR", reason: "article_processing_failed" };
  if (articles.length < 3 || articles.some((item) => item.status !== "completed")) return { verdict: "FAIL", category: "COVERAGE GAP", reason: "article_processing_incomplete" };
  if (!match || match.status !== "matched" || Number(match.metrics?.crossSourceMatches || 0) < 1) {
    const rejected = Number(match?.metrics?.matchesRejected || 0) > 0;
    return { verdict: rejected ? "FAIL" : "PARTIAL", category: rejected ? "MATCH REJECTION" : "SAFETY ABSTENTION", reason: `event_match_${match?.status || "missing"}` };
  }
  if (!comparison || comparison.status !== "ready") return { verdict: "PARTIAL", category: "COVERAGE GAP", reason: "source_comparison_not_ready" };
  return { verdict: "PASS", category: "SUCCESS", reason: conflicts.length ? "matched_with_conflict_candidates" : "matched_without_conflict_candidates" };
}

module.exports = {
  ACCEPTANCE_DB_PATTERN,
  PRODUCTION_READ_STATEMENTS,
  assertAcceptanceDatabaseName,
  assertAcceptanceOptIn,
  assertProductionReadSql,
  buildRunId,
  classifyAcceptanceResult,
  createAcceptanceDatabaseController,
  createProductionReadAdapter,
  firstStatementToken,
  parseArticleIds,
  validateArticleFixtures,
};
