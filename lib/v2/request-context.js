"use strict";

const { randomUUID } = require("node:crypto");
const { isV2Enabled } = require("./feature-flags");
const { CONTRACT_VERSIONS } = require("./contract-versions");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ARTICLE_ID_MAX = 18446744073709551615n;
const ENVIRONMENTS = new Set(["development", "test", "staging", "production", "offline"]);

function normalizeUuid(value, field, fallback = randomUUID()) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) throw new TypeError(`${field} must be a UUID`);
  return normalized;
}

function normalizeArticleId(value) {
  if (value == null) return undefined;
  let normalized;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError("articleId must be a positive integer");
    normalized = String(value);
  } else if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    normalized = value.trim().replace(/^0+(?=\d)/, "");
    if (normalized === "0") throw new TypeError("articleId must be a positive integer");
  } else {
    throw new TypeError("articleId must be a positive integer");
  }
  if (BigInt(normalized) > ARTICLE_ID_MAX) throw new RangeError("articleId is outside BIGINT UNSIGNED range");
  return normalized;
}

function resolveEnvironment(env) {
  const offline = String(env.UTOM_OFFLINE_MODE ?? "true").trim().toLowerCase() !== "false";
  const value = offline ? "offline" : String(env.NODE_ENV || "development").trim().toLowerCase();
  if (!ENVIRONMENTS.has(value)) throw new TypeError("environment is invalid");
  return value;
}

function createV2RequestContext(options = {}) {
  if (options == null || typeof options !== "object" || Array.isArray(options)) throw new TypeError("context options must be an object");
  const env = options.env && typeof options.env === "object" ? options.env : process.env;
  const now = options.clock ? options.clock() : new Date();
  const startedAt = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(startedAt.getTime())) throw new TypeError("clock must produce a valid date");
  const idGenerator = options.idGenerator || randomUUID;
  if (typeof idGenerator !== "function") throw new TypeError("idGenerator must be a function");
  const requestId = normalizeUuid(options.requestId, "requestId", idGenerator());
  const runId = normalizeUuid(options.runId, "runId", idGenerator());
  const articleId = normalizeArticleId(options.articleId);
  const context = {
    requestId,
    runId,
    ...(articleId ? { articleId } : {}),
    environment: resolveEnvironment(env),
    knowledgeSchemaVersion: CONTRACT_VERSIONS.knowledgeSchema,
    extractionSchemaVersion: CONTRACT_VERSIONS.extractionSchema,
    vocabularyVersion: CONTRACT_VERSIONS.vocabulary,
    resolverVersion: CONTRACT_VERSIONS.resolver,
    startedAt: startedAt.toISOString(),
    v2Enabled: isV2Enabled(env),
  };
  return Object.freeze(context);
}

module.exports = { createV2RequestContext };
