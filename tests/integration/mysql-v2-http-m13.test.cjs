"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
function startServer(port, flag) {
  const dbUrl = new URL(process.env.UTOM_TEST_MYSQL_URL), root = path.resolve(__dirname, "../..");
  // Own the actual server process, not an npm/cmd parent that leaves Next alive.
  const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: root, env: { ...process.env, NODE_ENV: "production", DB_HOST: dbUrl.hostname, DB_PORT: dbUrl.port || "3306", DB_USER: decodeURIComponent(dbUrl.username), DB_PASSWORD: decodeURIComponent(dbUrl.password), DB_NAME: dbUrl.pathname.slice(1), UTOM_V2_ENABLED: flag, UTOM_API_KEY: "m13-http-test-key", UTOM_ALLOWED_ORIGIN: `http://127.0.0.1:${port}`, UTOM_TRUST_PROXY_HEADERS: "false", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const app = { child, output: "", ready: false, error: null };
  const collect = chunk => { app.output = (app.output + chunk.toString()).slice(-8000); app.ready ||= /Ready in/u.test(app.output); };
  child.stdout.on("data", collect); child.stderr.on("data", collect);
  child.on("error", error => { app.error = error; });
  return app;
}
async function waitFor(url, app) {
  const origin = new URL(url).origin, deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (app.error) throw app.error;
    if (app.child.exitCode !== null || app.child.signalCode !== null) throw new Error(`http_server_exited:${app.output}`);
    // Do not accept a response from another process after an EADDRINUSE failure.
    if (app.ready) try { const response = await fetch(url, { headers: { "x-api-key": "m13-http-test-key", origin }, signal: AbortSignal.timeout(1000) }); if (response.status !== 503) return response; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`http_server_timeout:${app.output}`);
}
async function stopServer(app) {
  if (!app || app.child.exitCode !== null || app.child.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("http_server_stop_timeout")), 8000);
    app.child.once("exit", () => { clearTimeout(timer); resolve(); });
    app.child.kill();
  });
}

test("M13 HTTP runtime smoke validates feature OFF/ON and envelope", { skip: !enabled }, async () => {
  const connection = await connect(); const suffix = `${Date.now()}`; let server; let serverOff;
  try {
    await applyMigrations(connection, loadMigrations());
    const [entity] = await connection.execute("INSERT INTO v2_entities (entity_type,canonical_name,normalized_name,language,status,created_at,updated_at) VALUES ('person','HTTP Entity',?, 'hu','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [`http entity ${suffix}`]);
    const port = await freePort(); server = startServer(port, "true");
    const on = await waitFor(`http://127.0.0.1:${port}/api/v2/entities/${entity.insertId}`, server); assert.equal(on.status, 200); const body = await on.json(); assert.equal(body.meta.schemaVersion, "v2.envelope.1"); assert.deepEqual(Object.keys(body.data).sort(), ["aliases", "evidenceSummary", "id", "name", "timeline", "type"].sort());
    await stopServer(server); assert.notEqual(server.child.exitCode ?? server.child.signalCode, null); server = null;
    const offPort = await freePort(); serverOff = startServer(offPort, "false"); const off = await waitFor(`http://127.0.0.1:${offPort}/api/v2/entities/${entity.insertId}`, serverOff); assert.equal(off.status, 404); const offBody = await off.json(); assert.equal(offBody.errors[0].code, "v2_disabled");
  } finally { try { await stopServer(server); await stopServer(serverOff); } finally { await connection.end(); } }
});
