#!/usr/bin/env node
"use strict";

function requireValue(name, env = process.env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function buildRequest(env = process.env) {
  const token = requireValue("UTOM_INTERNAL_WORKER_TOKEN", env);
  if (token.length < 32) throw new Error("internal_worker_token_too_short");
  const expected = {
    UTOM_OFFLINE_MODE: "false", DB_WRITE_ENABLED: "true", FEED_FETCH_ENABLED: "true",
    REAL_AI_ENABLED: "false", UTOM_PAID_AI_ENABLED: "false", AI_PROVIDER: "mock",
    BACKGROUND_JOBS_ENABLED: "false", UTOM_V2_ENABLED: "false",
  };
  for (const [name, value] of Object.entries(expected)) {
    if (String(env[name] || "").trim().toLowerCase() !== value) throw new Error(`unsafe_${name.toLowerCase()}_configuration`);
  }
  const base = new URL(String(env.UTOM_INTERNAL_BASE_URL || "http://127.0.0.1:3000"));
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("invalid_internal_base_url");
  const timeout = Number(env.UTOM_FEED_ONCE_TIMEOUT_MS || 180000);
  if (!Number.isSafeInteger(timeout) || timeout < 10000 || timeout > 300000) throw new Error("invalid_feed_once_timeout");
  return { url: new URL("/api/fetch-feed", base), token, timeout };
}

async function main() {
  const request = buildRequest();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("feed_fetch_timeout")), request.timeout);
  try {
    const response = await fetch(request.url, { method: "POST", headers: { authorization: `Bearer ${request.token}`, accept: "application/json" }, signal: controller.signal });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { error: "invalid_json_response", preview: text.slice(0, 500) }; }
    console.log(JSON.stringify({ endpoint: request.url.origin + request.url.pathname, status: response.status, ok: response.ok, body }, null, 2));
    if (!response.ok) process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
}

if (require.main === module) main().catch((error) => { console.error(`FEED_FETCH_ONCE: FAIL ${error.name === "AbortError" ? "timeout" : error.message}`); process.exitCode = 1; });

module.exports = { buildRequest };
