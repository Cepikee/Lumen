"use strict";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEMO_USERS = Object.freeze({
  anonymous: null,
  free: "demo-free",
  premium: "demo-premium",
  expired: "demo-expired",
});

function requestHostIsLoopback(host) {
  if (!host) return false;
  let normalized = String(host).trim().toLowerCase();
  if (normalized.startsWith("[")) normalized = normalized.slice(1, normalized.indexOf("]"));
  else if (normalized.split(":").length === 2) normalized = normalized.split(":")[0];
  return LOOPBACK_HOSTS.has(normalized);
}

function isV2DemoAllowed(env = process.env, requestHost = "") {
  return env.NODE_ENV !== "production"
    && env.UTOM_V2_DEMO_ENABLED === "true"
    && requestHostIsLoopback(requestHost)
    && LOOPBACK_HOSTS.has(String(env.DB_HOST || "").trim().toLowerCase())
    && String(env.DB_NAME || "") === "utom_dev";
}

function demoGuardFailure(env = process.env, requestHost = "") {
  if (env.NODE_ENV === "production") return "production";
  if (env.UTOM_V2_DEMO_ENABLED !== "true") return "demo_disabled";
  if (!requestHostIsLoopback(requestHost)) return "request_not_loopback";
  if (!LOOPBACK_HOSTS.has(String(env.DB_HOST || "").trim().toLowerCase())) return "database_not_loopback";
  if (String(env.DB_NAME || "") !== "utom_dev") return "database_not_demo";
  return null;
}

function selectedDemoUser(value) {
  const key = String(value || "anonymous").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, key) ? key : "anonymous";
}

function toSafeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function displayPredicate(predicate) {
  return ({ works_for: "dolgozik ennél", located_in: "működik itt", has_value: "értéke" })[predicate] || String(predicate || "ismeretlen kapcsolat").replaceAll("_", " ");
}

module.exports = {
  DEMO_USERS,
  LOOPBACK_HOSTS,
  requestHostIsLoopback,
  isV2DemoAllowed,
  demoGuardFailure,
  selectedDemoUser,
  toSafeNumber,
  displayPredicate,
};
