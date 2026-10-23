#!/usr/bin/env node
"use strict";

const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const { createMysqlAiCostRepository } = require("../lib/ai/cost-repository");

const envFile = String(process.env.UTOM_ENV_FILE || "").trim();
if (envFile) dotenv.config({ path: path.resolve(envFile), override: false });

function huf(micros) {
  return Number(micros || 0) / 1_000_000;
}

async function main() {
  const pilotId = String(process.env.AI_COST_PILOT_ID || "").trim();
  if (!pilotId) throw new Error("AI_COST_PILOT_ID is required");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 2,
  });
  try {
    const snapshot = await createMysqlAiCostRepository(pool).status(pilotId);
    const operations = snapshot.operations.map((row) => ({ status: row.status, calls: Number(row.ai_calls), articles: Number(row.articles), reservedHuf: huf(row.reserved_cost_micros), actualHuf: huf(row.actual_cost_micros), inputTokens: Number(row.input_tokens), outputTokens: Number(row.output_tokens) }));
    const scopes = snapshot.scopes.map((row) => {
      const limitHuf = huf(row.limit_micros);
      const reservedHuf = huf(row.reserved_micros);
      const actualHuf = huf(row.actual_micros);
      return { type: row.scope_type, key: row.scope_key, limitHuf, reservedHuf, actualHuf, remainingHuf: Math.max(0, limitHuf - reservedHuf - actualHuf), calls: Number(row.request_count) };
    });
    const totals = { processedArticles: Number(snapshot.totals.processed_articles), articlesWithAiReservations: Number(snapshot.totals.articles), aiCalls: Number(snapshot.totals.ai_calls), completedCalls: Number(snapshot.totals.completed_calls), uncertainCalls: Number(snapshot.totals.uncertain_calls), inputTokens: Number(snapshot.totals.input_tokens), outputTokens: Number(snapshot.totals.output_tokens), actualCostHuf: huf(snapshot.totals.actual_cost_micros) };
    console.log(JSON.stringify({ pilotId, totals, operations, scopes }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(`AI cost status failed: ${error.message}`); process.exitCode = 1; });
