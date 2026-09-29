#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { loadMigrations, getMigrationStatus, applyMigrations } = require("../db/migration-core.cjs");
const { checkSchemaReadiness, getHealthSnapshot } = require("../lib/operations");

async function scalar(connection, sql, params = []) { const [[row]] = await connection.execute(sql, params); return row; }
async function main() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const migrations = loadMigrations();
    const before = await getMigrationStatus(connection, migrations);
    const [tables] = await connection.query("SELECT TABLE_NAME tableName,TABLE_ROWS estimatedRows,DATA_LENGTH dataBytes,INDEX_LENGTH indexBytes FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME");
    const counts = await scalar(connection, "SELECT COUNT(*) articles,SUM(status='pending') pending,SUM(status='done') done,SUM(status='failed') failed FROM articles");
    const timings = [];
    for (const migration of migrations.filter((item) => before.pending.includes(item.filename))) {
      const started = process.hrtime.bigint();
      await applyMigrations(connection, migrations.filter((item) => item.version <= migration.version));
      timings.push({ migration: migration.filename, durationMs: Number(process.hrtime.bigint() - started) / 1e6 });
    }
    const integrity = {
      duplicateUrlIdentity: Number((await scalar(connection, "SELECT COUNT(*) count FROM (SELECT url_identity FROM articles GROUP BY url_identity HAVING COUNT(*)>1) d")).count),
      duplicateSummary: Number((await scalar(connection, "SELECT COUNT(*) count FROM (SELECT article_id FROM summaries WHERE article_id IS NOT NULL GROUP BY article_id HAVING COUNT(*)>1) d")).count),
      orphanSummary: Number((await scalar(connection, "SELECT COUNT(*) count FROM summaries s LEFT JOIN articles a ON a.id=s.article_id WHERE s.article_id IS NOT NULL AND a.id IS NULL")).count),
      orphanKeyword: Number((await scalar(connection, "SELECT COUNT(*) count FROM keywords k LEFT JOIN articles a ON a.id=k.article_id WHERE a.id IS NULL")).count),
      orphanCluster: Number((await scalar(connection, "SELECT COUNT(*) count FROM articles a LEFT JOIN clusters c ON c.id=a.cluster_id WHERE a.cluster_id IS NOT NULL AND c.id IS NULL")).count),
      missingIdentity: Number((await scalar(connection, "SELECT COUNT(*) count FROM articles WHERE url_identity IS NULL OR url_identity='' ")).count),
    };
    const healthTimes = [];
    for (let i = 0; i < 10; i++) { const start = process.hrtime.bigint(); await getHealthSnapshot(connection); healthTimes.push(Number(process.hrtime.bigint() - start) / 1e6); }
    const readiness = await checkSchemaReadiness(connection);
    const [plans] = await connection.query("EXPLAIN ANALYZE SELECT id FROM articles WHERE status='pending' ORDER BY created_at,id LIMIT 1");
    console.log(JSON.stringify({ before: { currentVersion: before.currentVersion, pending: before.pending }, counts, tables, migrationTimings: timings, integrity, readiness, healthLatencyMs: { min: Math.min(...healthTimes), max: Math.max(...healthTimes), average: healthTimes.reduce((a,b)=>a+b,0)/healthTimes.length }, pendingClaimPlan: plans.map((row) => Object.values(row)[0]) }, null, 2));
    if (!readiness.ready || Object.values(integrity).some(Boolean)) process.exitCode = 1;
  } finally { await connection.end(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
