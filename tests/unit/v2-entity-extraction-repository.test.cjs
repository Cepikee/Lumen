"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createIngestionEnvelope } = require("../../lib/v2/ingestion-envelope");
const { persistEntityExtraction } = require("../../lib/v2/entity-extraction-repository");

test("M4 repository persists audit and typed unresolved mention without raw provider output", async () => {
  const calls = [];
  const connection = { async execute(sql, params) { calls.push({ sql, params }); return [{ insertId: 17, affectedRows: 1 }, []]; } };
  const envelope = createIngestionEnvelope({ originalUrl: "https://example.com/persist", title: "OTP Bank", content: "OTP Bank." }).envelope;
  const outcome = { status: "completed", provider: "mock", model: "deterministic-mock-entity-v1", result: { entities: [{ mentionText: "OTP Bank", normalizedCandidateName: "OTP Bank", entityType: "company", confidence: 1, evidence: { start: 0, end: 8 } }] } };
  const result = await persistEntityExtraction(connection, { articleId: 12, envelope, outcome });
  assert.equal(result.status, "completed");
  assert.equal(result.mentionCount, 1);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /v2_ai_runs/);
  assert.match(calls[1].sql, /v2_entity_mentions/);
  assert.equal(calls[0].params.includes(JSON.stringify(outcome.result)), false);
});

test("M4 empty extraction is a successful audit with no mention insert", async () => {
  const calls = [];
  const connection = { async execute(sql, params) { calls.push({ sql, params }); return [{ insertId: 18, affectedRows: 1 }, []]; } };
  const envelope = createIngestionEnvelope({ originalUrl: "https://example.com/empty", title: "", content: "" }).envelope;
  const result = await persistEntityExtraction(connection, { articleId: 13, envelope, outcome: { status: "completed", provider: "mock", model: "deterministic-mock-entity-v1", result: { entities: [] } } });
  assert.equal(result.status, "completed");
  assert.equal(result.mentionCount, 0);
  assert.equal(calls.length, 1);
});
