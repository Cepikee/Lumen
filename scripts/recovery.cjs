#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { assertSchemaReadiness, inspectRecovery, retryRecovery, redact } = require("../lib/operations");

function databaseConfig() {
  for (const name of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) if (!process.env[name]) throw new Error(`missing_environment:${name}`);
  return { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME };
}

async function main() {
  const [action, rawId, stepName] = process.argv.slice(2);
  const articleId = Number(rawId);
  if (!Number.isSafeInteger(articleId) || articleId <= 0 || !["inspect", "retry"].includes(action)) {
    throw new Error("usage: recovery.cjs inspect <article-id> | retry <article-id> <step-name>");
  }
  const connection = await mysql.createConnection(databaseConfig());
  try {
    await assertSchemaReadiness(connection);
    const result = action === "inspect"
      ? await inspectRecovery(connection, articleId)
      : await retryRecovery(connection, articleId, stepName, process.env.UTOM_RECOVERY_ACTOR || `cli-${process.pid}`);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally { await connection.end(); }
}

main().catch((error) => { console.error(redact(error instanceof Error ? error.message : error)); process.exitCode = 1; });
