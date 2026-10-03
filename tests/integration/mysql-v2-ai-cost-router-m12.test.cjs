"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { persistDecision } = require("../../lib/v2/ai-cost-router-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() { const url = new URL(process.env.UTOM_TEST_MYSQL_URL); return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) }); }
function input(articleId, fingerprint = "a".repeat(64)) { return { articleId, step: "claims", inputFingerprint: fingerprint, deterministicEligible: true, budget: { limits: { dailyCost: 10, monthlyCost: 100, perArticleCost: 2, perStepCost: 1 }, usage: { dailyCost: 0, monthlyCost: 0, perArticleCost: 0, perStepCost: 0 } } }; }

test("M12 MySQL decision persistence is retry-safe and concurrent", { skip: !enabled }, async () => {
  const first = await connect(); const second = await connect();
  try {
    await applyMigrations(first, loadMigrations());
    const [article] = await first.execute("INSERT INTO articles (title,url_canonical,status) VALUES (?,?,?)", ["M12 fixture", `https://m12.invalid/${Date.now()}`, "pending"]);
    const base = input(article.insertId);
    const initial = await persistDecision(first, base);
    const retry = await persistDecision(first, base);
    assert.equal(initial.decisionId, retry.decisionId);
    assert.equal(retry.idempotent, true);
    const concurrent = await Promise.all([persistDecision(first, input(article.insertId, "b".repeat(64))), persistDecision(second, input(article.insertId, "b".repeat(64)))]);
    assert.deepEqual(concurrent.map((item) => item.decisionId).sort(), [concurrent[0].decisionId, concurrent[0].decisionId].sort());
    const [[count]] = await first.execute("SELECT COUNT(*) count FROM v2_ai_decisions WHERE article_id=?", [article.insertId]);
    assert.equal(Number(count.count), 2);
  } finally { await first.end(); await second.end(); }
});

test("M12 MySQL caller rollback removes decision", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,status) VALUES (?,?,?)", ["M12 rollback", `https://m12.invalid/rollback-${Date.now()}`, "pending"]);
    await connection.beginTransaction();
    await persistDecision(connection, input(article.insertId, "c".repeat(64)));
    await connection.rollback();
    const [[count]] = await connection.execute("SELECT COUNT(*) count FROM v2_ai_decisions WHERE article_id=? AND input_fingerprint=?", [article.insertId, "c".repeat(64)]);
    assert.equal(Number(count.count), 0);
  } finally { await connection.end(); }
});

console.log("M12 MySQL AI cost router regression: PASS");
