#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { validateWorkerEnvironment, assertSchemaReadiness, redact } = require("../lib/operations");
const { runRetentionBatch, retentionPolicy } = require("../lib/raw-text-retention");

function databaseConfig() {
  for (const name of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) if (!String(process.env[name] || "").trim()) throw new Error(`missing_environment:${name}`);
  return { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionLimit: 2 };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || [...args].some((arg) => !["--dry-run", "--execute", "--help"].includes(arg))) throw new Error("usage: raw-text-retention.cjs [--dry-run|--execute]");
  if (args.has("--dry-run") && args.has("--execute")) throw new Error("retention_modes_are_mutually_exclusive");
  const execute = args.has("--execute");
  if (execute && process.env.UTOM_RETENTION_EXECUTE !== "true") throw new Error("retention_execute_requires_UTOM_RETENTION_EXECUTE_true");
  validateWorkerEnvironment(process.env);
  const pool = mysql.createPool(databaseConfig());
  try {
    await assertSchemaReadiness(pool);
    const result = await runRetentionBatch(pool, { dryRun: !execute, batchSize: Number(process.env.RETENTION_BATCH_SIZE || 100), workerId: process.env.UTOM_RETENTION_WORKER_ID, env: process.env });
    process.stdout.write(`${JSON.stringify({ ...result, policy: retentionPolicy(process.env) })}\n`);
  } finally { await pool.end(); }
}

main().catch((error) => { console.error(redact(error instanceof Error ? error.message : error)); process.exitCode = 1; });
