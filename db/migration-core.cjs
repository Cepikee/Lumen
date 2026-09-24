"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const METADATA_SQL = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(12) NOT NULL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

function loadMigrations(dir = path.join(__dirname, "migrations")) {
  const filenames = fs.readdirSync(dir).filter((name) => /^\d{3}_[a-z0-9_-]+\.sql$/.test(name)).sort();
  if (!filenames.length) throw new Error("No migration files were found");
  const seen = new Set();
  return filenames.map((filename) => {
    const version = filename.slice(0, 3);
    if (seen.has(version)) throw new Error(`Duplicate migration version: ${version}`);
    seen.add(version);
    const sql = fs.readFileSync(path.join(dir, filename), "utf8").trim();
    if (!sql) throw new Error(`Empty migration: ${filename}`);
    // Each file must contain one statement. Never split SQL on arbitrary semicolons.
    const noComments = sql.replace(/^\s*--[^\n]*$/gm, "").trim();
    if (!/^(CREATE TABLE|ALTER TABLE|CREATE INDEX)\s/i.test(noComments)) {
      throw new Error(`Unsupported migration statement in ${filename}`);
    }
    if (noComments.slice(0, -1).includes(";")) {
      throw new Error(`Only one SQL statement is allowed in ${filename}`);
    }
    return { version, filename, sql: sql.replace(/;\s*$/, ""), checksum: crypto.createHash("sha256").update(sql).digest("hex") };
  });
}

function validateDatabaseTarget(env = process.env) {
  if (env.NODE_ENV === "production" || env.UTOM_OFFLINE_MODE !== "true" || env.DB_MIGRATION_ENABLED !== "true") {
    throw new Error("Migrations require explicit offline local opt-in; production is forbidden");
  }
  if (env.DB_NAME !== "utom_dev") {
    throw new Error("For this reconstruction, DB_NAME must be the existing local utom_dev database");
  }
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(env.DB_HOST)) {
    throw new Error("Migrations require a loopback DB_HOST");
  }
  if (!env.DB_USER || !env.DB_PASSWORD) throw new Error("Local database credentials are required");
  const port = Number(env.DB_PORT || "3306");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid DB_PORT");
  return { host: env.DB_HOST, port, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, multipleStatements: false };
}

async function applyMigrations(connection, migrations) {
  const [[lock]] = await connection.query("SELECT GET_LOCK(?, 10) AS acquired", ["utom:local:migrations"]);
  if (lock.acquired !== 1) throw new Error("Could not acquire migration lock");
  try {
    await connection.query(METADATA_SQL);
    const [rows] = await connection.query("SELECT version, filename, checksum FROM schema_migrations ORDER BY version");
    const applied = new Map(rows.map((r) => [String(r.version), r]));
    const available = new Set(migrations.map((m) => m.version));
    for (const row of rows) {
      if (!available.has(String(row.version))) throw new Error(`Applied migration missing from source: ${row.version}`);
    }
    const executed = [];
    for (const migration of migrations) {
      const previous = applied.get(migration.version);
      if (previous) {
        if (previous.filename !== migration.filename || previous.checksum !== migration.checksum) {
          throw new Error(`Migration checksum/filename mismatch: ${migration.filename}`);
        }
        continue;
      }
      await connection.query(migration.sql);
      // MySQL DDL commits independently; metadata is deliberately written only after successful DDL.
      await connection.execute(
        "INSERT INTO schema_migrations (version, filename, checksum) VALUES (?, ?, ?)",
        [migration.version, migration.filename, migration.checksum]
      );
      executed.push(migration.filename);
    }
    return executed;
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", ["utom:local:migrations"]);
  }
}

module.exports = { METADATA_SQL, loadMigrations, validateDatabaseTarget, applyMigrations };
