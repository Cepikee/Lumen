"use strict";

function parsePublicationTime(value) {
  if (value == null || String(value).trim() === "") return null;
  const text = String(value).trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2}|\b(?:UT|UTC|GMT)\b)$/i.test(text);
  if (!hasTimezone) return null;
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds)) return null;
  const date = new Date(milliseconds);
  const year = date.getUTCFullYear();
  if (year < 1990 || milliseconds > Date.now() + 366 * 86_400_000) return null;
  return date;
}

function toMysqlUtc(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function resolvePublicationTime(values, now = new Date()) {
  for (const candidate of values || []) {
    const date = parsePublicationTime(candidate.value);
    if (date) return { date, mysqlUtc: toMysqlUtc(date), source: candidate.source };
  }
  return { date: now, mysqlUtc: toMysqlUtc(now), source: "ingested_at_fallback" };
}

module.exports = { parsePublicationTime, resolvePublicationTime, toMysqlUtc };
