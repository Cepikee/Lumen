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
    // Prevent accidental overwrite of an existing legacy or partially initialized database.
    if (tableNames.some((t) => t !== "schema_migrations" && !migrations.some((m) => m.version === "001" && t === "sources"))) {
      throw new Error("Unexpected existing tables: use a fresh empty utom_local_* database");
    }
    const executed = await applyMigrations(connection, migrations);
    console.log(executed.length ? `Applied: ${executed.join(", ")}` : "No changes: all migrations already applied");
  } finally {
    await connection.end();
  }
}

main().catch((error) => { console.error(`Migration failed: ${error.message}`); process.exitCode = 1; });
