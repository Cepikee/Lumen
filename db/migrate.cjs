#!/usr/bin/env node
"use strict";

const { loadMigrations, validateDatabaseTarget, applyMigrations } = require("./migration-core.cjs");

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && args[0] !== "--apply" && args[0] !== "--plan")) {
    throw new Error("Usage: node db/migrate.cjs [--plan | --apply]");
  }
  const migrations = loadMigrations();
  if (args[0] !== "--apply") {
    console.log("READ-ONLY migration plan (no database connection):");
    for (const m of migrations) console.log(`${m.version} ${m.filename} sha256=${m.checksum}`);
    return;
  }
  // The CLI intentionally does not read .env files or create databases.
  const config = validateDatabaseTarget(process.env);
  const mysql = require("mysql2/promise");
  const connection = await mysql.createConnection(config);
  try {
    const [nameRows] = await connection.query("SELECT DATABASE() AS current_db");
    if (nameRows[0]?.current_db !== config.database) throw new Error("Connected database differs from configured target");
    const [tables] = await connection.query("SHOW TABLES");
    const tableNames = tables.map((row) => Object.values(row)[0]);
    // Never take over an existing populated database that was not created by this migrator.
    // A clean utom_dev is allowed; a repeat run is allowed only with a complete migration ledger.
    const existing = tableNames.filter((t) => t !== "schema_migrations");
    if (existing.length) {
      if (!tableNames.includes("schema_migrations")) throw new Error("Existing schema without migration ledger: stop and inspect manually");
      const [applied] = await connection.query("SELECT version, filename FROM schema_migrations ORDER BY version");
      const known = new Set(migrations.filter(m => applied.some(r => String(r.version) === m.version && r.filename === m.filename)).map(m => m.filename.replace(/^\d{3}_/, "").replace(/\.sql$/, "")));
      if (!applied.length || existing.some(t => !known.has(t))) {
        throw new Error("Untracked existing tables in utom_dev: stop and inspect manually");
      }
    }
    const executed = await applyMigrations(connection, migrations);
    console.log(executed.length ? `Applied: ${executed.join(", ")}` : "No changes: all migrations already applied");
  } finally {
    await connection.end();
  }
}

main().catch((error) => { console.error(`Migration failed: ${error.message}`); process.exitCode = 1; });
