"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const contract = require("../fixtures/v2-schema-contract.cjs");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);

function safeConfig() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const database = url.pathname.slice(1);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !database.endsWith("_test")) throw new Error("MySQL integration tests require a loopback _test database");
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

async function resetDatabase(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  const [tables] = await connection.query("SHOW TABLES");
  for (const row of tables) await connection.query(`DROP TABLE \`${Object.values(row)[0]}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
}

function normalizedType(value) {
  const normalized = String(value).toLowerCase().replaceAll(" ", " ");
  // MySQL stores BOOLEAN as the documented TINYINT(1) alias in
  // information_schema; compare the semantic type, not its display spelling.
  return normalized === "boolean" ? "tinyint(1)" : normalized;
}

test("M1.4 MySQL schema matches the M1.3 fixture", { skip: !enabled }, async () => {
  const connection = await mysql.createConnection(safeConfig());
  try {
    await resetDatabase(connection);
    const migrations = loadMigrations();
    const applied = await applyMigrations(connection, migrations);
    assert.equal(applied.length, migrations.length);
    assert.equal(migrations.at(-1).version, "053");
    assert.deepEqual(await applyMigrations(connection, migrations), []);

    const [tableRows] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'v2\\_%'");
    const actualV2Tables = new Set(tableRows.map((row) => row.TABLE_NAME));
    for (const tableName of Object.keys(contract.tables)) assert.equal(actualV2Tables.has(tableName), true, `${tableName} exists`);
    const [[freshLedger]] = await connection.execute("SELECT COUNT(*) count, MAX(version) latest FROM schema_migrations");
    assert.equal(Number(freshLedger.count), 53);
    assert.equal(freshLedger.latest, "053");
    const [legacyTables] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('sources','articles')");
    assert.deepEqual(legacyTables.map((row) => row.TABLE_NAME).sort(), ["articles", "sources"]);

    for (const [tableName, expected] of Object.entries(contract.tables)) {
      const [columns] = await connection.execute("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION", [tableName]);
      assert.equal(columns.length, Object.keys(expected.columns).length, `${tableName} column count`);
      for (const [columnName, definition] of Object.entries(expected.columns)) {
        const actual = columns.find((column) => column.COLUMN_NAME === columnName);
        assert.ok(actual, `${tableName}.${columnName}`);
        assert.equal(normalizedType(actual.COLUMN_TYPE), normalizedType(definition.type), `${tableName}.${columnName} type`);
        assert.equal(actual.IS_NULLABLE, definition.nullable ? "YES" : "NO", `${tableName}.${columnName} nullability`);
        assert.equal(Boolean(String(actual.EXTRA).includes("auto_increment")), definition.autoIncrement === true, `${tableName}.${columnName} identity`);
      }

      const [indexes] = await connection.execute("SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME, SEQ_IN_INDEX", [tableName]);
      for (const unique of expected.unique) {
        const rows = indexes.filter((index) => index.INDEX_NAME === unique.name);
        assert.equal(rows.length, unique.columns.length, `${tableName}.${unique.name}`);
        assert.equal(Number(rows[0].NON_UNIQUE), 0, `${tableName}.${unique.name} unique`);
        assert.deepEqual(rows.map((row) => row.COLUMN_NAME), unique.columns);
      }
      for (const index of expected.indexes) {
        const rows = indexes.filter((row) => row.INDEX_NAME === index.name);
        assert.equal(rows.length, index.columns.length, `${tableName}.${index.name}`);
        assert.deepEqual(rows.map((row) => row.COLUMN_NAME), index.columns);
      }

      const [foreignKeys] = await connection.execute("SELECT kcu.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE, rc.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE kcu JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA=kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME WHERE kcu.TABLE_SCHEMA=DATABASE() AND kcu.TABLE_NAME=? ORDER BY kcu.CONSTRAINT_NAME", [tableName]);
      assert.equal(foreignKeys.length, expected.foreignKeys.length, `${tableName} foreign key count`);
      for (const foreignKey of expected.foreignKeys) {
        const actual = foreignKeys.find((row) => row.COLUMN_NAME === foreignKey.columns[0] && row.REFERENCED_TABLE_NAME === foreignKey.table);
        assert.ok(actual, `${tableName}.${foreignKey.columns[0]} FK`);
        assert.equal(actual.REFERENCED_COLUMN_NAME, foreignKey.referencedColumns[0]);
        assert.equal(actual.DELETE_RULE, foreignKey.onDelete);
        assert.equal(actual.UPDATE_RULE, foreignKey.onUpdate);
      }
    }

    await resetDatabase(connection);
    const through033 = migrations.filter((migration) => Number(migration.version) <= 33);
    assert.equal((await applyMigrations(connection, through033)).length, 33);
    const [source] = await connection.execute("INSERT INTO sources (slug, name, homepage_url) VALUES ('m17-fixture', 'M1.7 fixture', 'https://fixture.invalid')");
    const [article] = await connection.execute("INSERT INTO articles (title, url_canonical, source_id, source, status) VALUES (?, ?, ?, ?, ?)", ["M1.7 legacy article", "https://fixture.invalid/m17", source.insertId, "m17-fixture", "pending"]);
    const upgraded = await applyMigrations(connection, migrations);
    assert.deepEqual(upgraded, migrations.filter((migration) => Number(migration.version) >= 34).map((migration) => migration.filename));
    assert.deepEqual(await applyMigrations(connection, migrations), []);
    const [[legacy]] = await connection.execute("SELECT a.title, s.slug FROM articles a JOIN sources s ON s.id=a.source_id WHERE a.id=?", [article.insertId]);
    assert.deepEqual(legacy, { title: "M1.7 legacy article", slug: "m17-fixture" });
    const [[upgradeV2Tables]] = await connection.execute("SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'v2\\_%'");
    assert.ok(Number(upgradeV2Tables.count) >= Object.keys(contract.tables).length);
  } finally {
    await connection.end();
  }
});
