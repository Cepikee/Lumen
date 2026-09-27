"use strict";

const crypto = require("node:crypto");

function parseValidEmbedding(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(Number.isFinite) ? parsed : null;
  } catch { return null; }
}

function existingClusterId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function speedHistoryEventKey(clusterId, source, delayMinutes) {
  return crypto.createHash("sha256").update(`${clusterId}|${source}|${Number(delayMinutes).toFixed(1)}`).digest("hex");
}

function uniqueKeywords(values) {
  const seen = new Set();
  return values.filter((value) => {
    const identity = String(value).trim().toLocaleLowerCase("hu-HU");
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

module.exports = { existingClusterId, parseValidEmbedding, speedHistoryEventKey, uniqueKeywords };
