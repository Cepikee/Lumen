"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }
function startServer(port, flag) { const dbUrl = new URL(process.env.UTOM_TEST_MYSQL_URL); const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "start", "--", "-p", String(port)], { cwd: require("node:path").resolve(__dirname, "../.."), env: { ...process.env, NODE_ENV: "production", DB_HOST: dbUrl.hostname, DB_PORT: dbUrl.port || "3306", DB_USER: decodeURIComponent(dbUrl.username), DB_PASSWORD: decodeURIComponent(dbUrl.password), DB_NAME: dbUrl.pathname.slice(1), UTOM_V2_ENABLED: flag, UTOM_API_KEY: "m13-http-test-key", UTOM_ALLOWED_ORIGIN: `http://127.0.0.1:${port}`, UTOM_TRUST_PROXY_HEADERS: "false" }, stdio: "ignore", shell: process.platform === "win32" }); return child; }
async function waitFor(url) { const origin = new URL(url).origin; for (let i = 0; i < 40; i += 1) { try { const response = await fetch(url, { headers: { "x-api-key": "m13-http-test-key", origin } }); if (response.status !== 503) return response; } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error("http_server_timeout"); }

test("M13 HTTP runtime smoke validates feature OFF/ON and envelope", { skip: !enabled }, async () => {
  const connection = await connect(); const suffix = `${Date.now()}`; let server; let serverOff;
  try {
    await applyMigrations(connection, loadMigrations());
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES ('person','HTTP Entity',?, 'hu','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`http entity ${suffix}`]);
    const port = 3210 + (Number(suffix.slice(-2)) % 400); server = startServer(port, "true");
    const on = await waitFor(`http://127.0.0.1:${port}/api/v2/entities/${entity.insertId}`); assert.equal(on.status, 200); const body = await on.json(); assert.equal(body.meta.schemaVersion, "v2.envelope.1"); assert.deepEqual(Object.keys(body.data).sort(), ["aliases", "evidenceSummary", "id", "name", "timeline", "type"].sort());
    server.kill(); server = null; serverOff = startServer(port + 1, "false"); const off = await waitFor(`http://127.0.0.1:${port + 1}/api/v2/entities/${entity.insertId}`); assert.equal(off.status, 404); const offBody = await off.json(); assert.equal(offBody.errors[0].code, "v2_disabled");
  } finally { if (server) server.kill(); if (serverOff) serverOff.kill(); await connection.end(); }
});

console.log("M13 HTTP runtime regression: PASS");
