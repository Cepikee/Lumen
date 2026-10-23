"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");
const { createMysqlAiCostRepository } = require("../../lib/ai/cost-repository");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);

function safeConfig() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const database = url.pathname.slice(1);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || !database.endsWith("_test")) throw new Error("MySQL integration tests require a loopback _test database");
  return { host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database };
}

function spec(articleId, operationKey, reservedCostMicros = 700) {
  return {
    operationKey, pilotId: "v1-parallel-test", articleId, stepName: "title", provider: "openai", model: "gpt-test", kind: "chat",
    usageDate: "2026-10-23", usageMonth: "2026-10", estimatedInputTokens: 100, reservedOutputTokens: 20,
    price: { inputMicrosPerMillion: 1000, outputMicrosPerMillion: 2000 }, safetyMultiplierMillis: 1500,
    reservedCostMicros, pricingVersion: "integration-test", limits: { dailyMicros: 1000, monthlyMicros: 1000, pilotMicros: 1000 }, timeoutMs: 5000,
  };
}

function uniqueId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function operationKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

test.before(async () => {
  if (!enabled) return;
  const connection = await mysql.createConnection(safeConfig());
  try {
    await applyMigrations(connection, loadMigrations());
  } finally {
    await connection.end();
  }
});

test("parallel workers cannot reserve beyond the shared limit and uncertain calls stay charged", { skip: !enabled }, async () => {
  const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 4 });
  try {
    const pilotId = uniqueId("v1-parallel-test");
    const [article] = await pool.execute("INSERT INTO articles (title,url_canonical,status) VALUES (?,?,?)", ["AI cost fixture", `https://cost.invalid/${Date.now()}`, "pending"]);
    const repo = createMysqlAiCostRepository(pool);
    const outcomes = await Promise.allSettled([
      repo.reserve({ ...spec(article.insertId, operationKey(`${pilotId}:a`)), pilotId }),
      repo.reserve({ ...spec(article.insertId, operationKey(`${pilotId}:b`)), pilotId }),
    ]);
    assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = outcomes.find((result) => result.status === "rejected");
    assert.equal(rejected.reason.code, "AI_BUDGET_EXHAUSTED");
    const winner = outcomes.find((result) => result.status === "fulfilled").value;
    await repo.markStarted(winner.operationKey);
    await repo.markUncertain(winner.operationKey, new Error("provider timeout"));
    await assert.rejects(repo.reserve({ ...spec(article.insertId, winner.operationKey), pilotId }), (error) => error.code === "AI_OPERATION_NOT_RETRYABLE");
    const [scopes] = await pool.execute("SELECT reserved_micros,actual_micros,request_count FROM ai_cost_budget_scopes WHERE scope_type='pilot' AND scope_key=?", [pilotId]);
    assert.equal(Number(scopes[0].reserved_micros), 700);
    assert.equal(Number(scopes[0].actual_micros), 0);
    assert.equal(Number(scopes[0].request_count), 1);
  } finally {
    await pool.end();
  }
});

test("successful completion converts reserved cost into actual token cost", { skip: !enabled }, async () => {
  const pool = mysql.createPool({ ...safeConfig(), connectionLimit: 2 });
  try {
    const pilotId = uniqueId("v1-settlement-test");
    const [article] = await pool.execute("INSERT INTO articles (title,url_canonical,status) VALUES (?,?,?)", ["AI settlement fixture", `https://cost.invalid/settle-${Date.now()}`, "pending"]);
    const repo = createMysqlAiCostRepository(pool);
    const reservation = await repo.reserve({ ...spec(article.insertId, operationKey(`${pilotId}:complete`), 700), pilotId });
    await repo.markStarted(reservation.operationKey);
    const result = await repo.complete(reservation.operationKey, { inputTokens: 100, outputTokens: 20, providerReportedCostMicros: null });
    assert.ok(result.actualCostMicros > 0);
    const [scopes] = await pool.execute("SELECT reserved_micros,actual_micros FROM ai_cost_budget_scopes WHERE scope_type='pilot' AND scope_key=?", [pilotId]);
    assert.equal(Number(scopes[0].reserved_micros), 0);
    assert.equal(Number(scopes[0].actual_micros), result.actualCostMicros);
  } finally {
    await pool.end();
  }
});
