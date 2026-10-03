"use strict";

const { CONTRACT_VERSIONS } = require("./contract-versions");

const MAX_LIMIT = 100;
function invalid(errors, status = "invalid") { return Object.freeze({ status, errors: Object.freeze([...new Set(errors)]) }); }
function positiveId(value, field = "id") { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function asOf(value) { const text = value == null ? new Date().toISOString() : String(value); const date = new Date(text); if (Number.isNaN(date.getTime())) throw new TypeError("as_of_invalid"); return date.toISOString(); }
function parseCursor(value) {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    if (!decoded || typeof decoded.orderingKey !== "string" || !decoded.orderingKey.trim() || !Number.isSafeInteger(Number(decoded.id)) || Number(decoded.id) < 1) throw new Error();
    return { orderingKey: decoded.orderingKey, id: Number(decoded.id) };
  } catch { throw new TypeError("cursor_invalid"); }
}
function encodeCursor(cursor) { return cursor == null ? null : Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url"); }
function validateReadInput(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["input_required"]);
  const errors = [];
  try { positiveId(input.id, "id"); } catch (error) { errors.push(error.message); }
  try { asOf(input.asOf); } catch (error) { errors.push(error.message); }
  const limit = input.limit == null ? 50 : Number(input.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) errors.push("limit_invalid");
  try { parseCursor(input.cursor); } catch (error) { errors.push(error.message); }
  return errors.length ? invalid(errors) : { status: "valid", result: Object.freeze({ id: positiveId(input.id, "id"), asOf: asOf(input.asOf), limit, cursor: parseCursor(input.cursor) }) };
}
function envelope(data, meta = {}, errors = []) { return Object.freeze({ data, meta: Object.freeze({ requestId: String(meta.requestId || "unknown"), schemaVersion: CONTRACT_VERSIONS.apiEnvelope, generatedAt: new Date().toISOString(), ...meta }), errors: Object.freeze(errors) }); }
function errorEnvelope(code, message, meta = {}) { return envelope(null, meta, [{ code, message }]); }
function projectArticleContext(row, summary = null) {
  if (!row || typeof row !== "object") return null;
  const id = positiveId(row.id, "article_id");
  const date = row.published_at == null ? null : new Date(row.published_at);
  return Object.freeze({ id, title: typeof row.title === "string" ? row.title : null, source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : null, category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : null, publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null, summary: summary && typeof summary === "object" ? Object.freeze({ id: summary.id == null ? null : Number(summary.id), text: typeof summary.text === "string" ? summary.text : null }) : null });
}

module.exports = { MAX_LIMIT, invalid, positiveId, asOf, parseCursor, encodeCursor, validateReadInput, envelope, errorEnvelope, projectArticleContext };
