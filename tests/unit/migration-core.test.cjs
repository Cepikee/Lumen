"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadMigrations, validateDatabaseTarget, applyMigrations } = require("../../db/migration-core.cjs");

test("offline migration plan is deterministic and begins with sources", () => {
  const a = loadMigrations();
  assert.equal(a[0].filename, "001_sources.sql");
  assert.deepEqual(a, loadMigrations());
});

test("local migrations reject unsafe targets and missing explicit opt-in", () => {
  const valid = { NODE_ENV: "development", UTOM_OFFLINE_MODE: "true", DB_MIGRATION_ENABLED: "true", DB_NAME: "utom_local_dev", DB_HOST: "127.0.0.1", DB_USER: "utom_migrator", DB_PASSWORD: "test-only" };
  assert.equal(validateDatabaseTarget(valid).multipleStatements, false);
  for (const bad of [ {DB_NAME:"projekt2025"}, {DB_HOST:"remote.example"}, {NODE_ENV:"production"}, {DB_MIGRATION_ENABLED:"false"}, {UTOM_OFFLINE_MODE:"false"}, {DB_PASSWORD:""} ]) {
    assert.throws(() => validateDatabaseTarget({...valid,...bad}));
  }
});

function fakeDb(rows=[]) {
  const state = { rows: [...rows], statements: [], released: false };
  const connection = {
    async query(sql) {
      state.statements.push(sql);
      if (sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
      if (sql.startsWith("SELECT RELEASE_LOCK")) {state.released=true; return [[]];}
      if (sql.startsWith("SELECT version")) return [state.rows];
      return [[]];
    },
    async execute(sql, params) {
      state.statements.push(sql);
      if (sql.startsWith("INSERT INTO schema_migrations")) state.rows.push({ version: params[0], filename: params[1], checksum: params[2] });
      return [[]];
    },
  };
  return {connection,state};
}

test("first migration runs once and is idempotent with same checksum", async () => {
  const db=fakeDb(), migrations=loadMigrations();
  assert.deepEqual(await applyMigrations(db.connection,migrations), ["001_sources.sql"]);
  assert.deepEqual(await applyMigrations(db.connection,migrations), []);
  assert.equal(db.state.rows.length,1);
  assert.equal(db.state.released,true);
});

test("checksum mismatch fails closed before running migration SQL", async () => {
  const m=loadMigrations()[0], db=fakeDb([{version:m.version, filename:m.filename, checksum:"0".repeat(64)}]);
  await assert.rejects(applyMigrations(db.connection,[m]), /checksum/);
  assert.equal(db.state.statements.includes(m.sql),false);
  assert.equal(db.state.released,true);
});

test("failed DDL does not record successful migration", async () => {
  const db=fakeDb(), m=loadMigrations()[0];
  const original=db.connection.query;
  db.connection.query = async (sql,...args) => sql === m.sql ? Promise.reject(new Error("DDL failed")) : original(sql,...args);
  await assert.rejects(applyMigrations(db.connection,[m]),/DDL failed/);
  assert.equal(db.state.rows.length,0);
  assert.equal(db.state.released,true);
});
