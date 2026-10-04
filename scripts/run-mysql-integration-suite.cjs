#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../db/migration-core.cjs");

function configFromUrl() {
  const raw = process.env.UTOM_TEST_MYSQL_URL;
  if (!raw) throw new Error("UTOM_TEST_MYSQL_URL is required");
  const url = new URL(raw);
  const database = url.pathname.slice(1);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !database.endsWith("_test")) {
    throw new Error("MySQL integration tests require a loopback _test database");
  }
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

async function resetAndMigrate(config) {
  const connection = await mysql.createConnection(config);
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    const [tables] = await connection.query("SHOW TABLES");
    for (const row of tables) await connection.query(`DROP TABLE \`${String(Object.values(row)[0]).replace(/`/g, "``")}\``);
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
    await applyMigrations(connection, loadMigrations());
  } finally {
    await connection.end();
  }
}

async function main() {
  const config = configFromUrl();
  const integrationDir = path.resolve(__dirname, "../tests/integration");
  const files = fs.readdirSync(integrationDir).filter((name) => name.endsWith(".test.cjs")).sort();
  for (const name of files) {
    await resetAndMigrate(config);
    const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", path.join(integrationDir, name)], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, UTOM_MYSQL_TEST_OPT_IN: process.env.UTOM_MYSQL_TEST_OPT_IN || "true" },
      stdio: "inherit",
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

main().catch((error) => { console.error(`MySQL integration suite failed: ${error.stack || error.message}`); process.exitCode = 1; });
