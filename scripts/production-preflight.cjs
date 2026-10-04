#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
const { loadMigrations, auditMigrationChain, getMigrationStatus } = require("../db/migration-core.cjs");
const { REQUIRED_SCHEMA, validateProductionEnvironment, checkSchemaReadiness, redact } = require("../lib/operations");

async function main() {
  const checks = [];
  const check = (name, ok, detail) => checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
  check("node_version", process.versions.node.split(".")[0] === "24", `major=${process.versions.node.split(".")[0]}`);
  try { validateProductionEnvironment(process.env); check("production_configuration", true, "required categories present"); }
  catch (error) { check("production_configuration", false, redact(error.message)); }
  try {
    const stats = fs.statfsSync(process.cwd());
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const minimum = Number(process.env.PRODUCTION_PREFLIGHT_MIN_FREE_BYTES || 10 * 1024 ** 3);
    check("free_disk", freeBytes >= minimum, `free_bytes=${freeBytes};required_bytes=${minimum}`);
  } catch (error) { check("free_disk", false, redact(error.message)); }
  check("build_artifact", fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID")), ".next/BUILD_ID");

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000,
    });
    await connection.query("SELECT 1");
    check("database_connectivity", true, "connected");
    const migrations = loadMigrations();
    const audit = auditMigrationChain(migrations);
    check("migration_source", audit.safeToApply && audit.latestVersion === REQUIRED_SCHEMA.latestVersion, `latest=${audit.latestVersion};required=${REQUIRED_SCHEMA.latestVersion};critical=${audit.findings.filter((x) => x.level === "critical").length}`);
    const status = await getMigrationStatus(connection, migrations);
    check("migration_status", status.currentVersion === REQUIRED_SCHEMA.latestVersion && status.pending.length === 0, `current=${status.currentVersion};required=${REQUIRED_SCHEMA.latestVersion};pending=${status.pending.length}`);
    const schema = await checkSchemaReadiness(connection);
    check("schema_readiness", schema.ready, schema.ready ? `exact_supported_schema=${REQUIRED_SCHEMA.latestVersion}` : schema.missing.join(","));
    if (schema.ready) {
      const [[articles]] = await connection.query("SELECT SUM(status='in_progress') active_claims FROM articles");
      const [[speed]] = await connection.query("SELECT SUM(status='in_progress') active_claims FROM speed_index_recalculation_jobs");
      const active = Number(articles.active_claims || 0) + Number(speed.active_claims || 0);
      check("active_claims", active === 0, `count=${active}`);
      const [[writers]] = await connection.query("SELECT SUM(state='running' AND heartbeat_at >= UTC_TIMESTAMP(6)-INTERVAL 3 MINUTE) active_writers FROM worker_runtime_health");
      check("active_writers", Number(writers.active_writers || 0) === 0, `count=${Number(writers.active_writers || 0)}`);
    }
  } catch (error) {
    check("database_connectivity", false, redact(error.message));
  } finally { if (connection) await connection.end(); }
  for (const item of checks) console.log(`${item.status} ${item.name} ${item.detail}`);
  const ok = checks.length >= 9 && checks.every((item) => item.status === "PASS");
  console.log(ok ? "PRODUCTION_PREFLIGHT: PASS" : "PRODUCTION_PREFLIGHT: FAIL");
  if (!ok) process.exitCode = 1;
}

main().catch((error) => { console.error(`PRODUCTION_PREFLIGHT: FAIL ${redact(error.message)}`); process.exitCode = 1; });
