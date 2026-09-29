#!/usr/bin/env node
"use strict";

const { loadMigrations, auditMigrationChain, getMigrationStatus, validateDatabaseTarget, applyMigrations } = require("./migration-core.cjs");

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && args[0] !== "--apply" && args[0] !== "--plan" && args[0] !== "--status")) {
    throw new Error("Usage: node db/migrate.cjs [--plan | --status | --apply]");
  }
  const migrations = loadMigrations();
  if (!args[0] || args[0] === "--plan") {
    const audit = auditMigrationChain(migrations);
    console.log(`READ-ONLY migration plan (no database connection): count=${audit.migrationCount} latest=${audit.latestVersion} safe=${audit.safeToApply}`);
    for (const m of migrations) console.log(`${m.version} ${m.filename} sha256=${m.checksum}`);
    for (const finding of audit.findings) console.log(`${finding.level.toUpperCase()} ${finding.migration} ${finding.issue}`);
    return;
  }
  // The CLI intentionally does not read .env files or create databases.
  const config = validateDatabaseTarget(process.env);
  const mysql = require("mysql2/promise");
  const { target, ...mysqlConfig } = config;
  const connection = await mysql.createConnection(mysqlConfig);
  try {
    const [nameRows] = await connection.query("SELECT DATABASE() AS current_db");
    if (nameRows[0]?.current_db !== config.database) throw new Error("Connected database differs from configured target");
    const [tables] = await connection.query("SHOW TABLES");
    const tableNames = tables.map((row) => Object.values(row)[0]);
    // Never take over an existing populated database that was not created by this migrator.
    // A clean utom_dev is allowed; a repeat run is allowed only with a complete migration ledger.
    const existing = tableNames.filter((t) => t !== "schema_migrations");
    if (existing.length && !tableNames.includes("schema_migrations")) throw new Error("Existing schema without migration ledger: stop and inspect manually");
    const status = await getMigrationStatus(connection, migrations);
    console.log(`Target=${target} current=${status.currentVersion || "none"} pending=${status.pending.length}`);
    for (const filename of status.pending) console.log(`PENDING ${filename}`);
    if (args[0] === "--status") return;
    const executed = await applyMigrations(connection, migrations);
    console.log(executed.length ? `Applied: ${executed.join(", ")}` : "No changes: all migrations already applied");
  } finally {
    await connection.end();
  }
}

main().catch((error) => { console.error(`Migration failed: ${error.message}`); process.exitCode = 1; });
