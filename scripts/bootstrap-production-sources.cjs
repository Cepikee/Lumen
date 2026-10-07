#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { SOURCES } = require("../lib/source-identity");

function assertSafeEnvironment(env = process.env) {
  if (String(env.UTOM_OFFLINE_MODE).toLowerCase() !== "false") throw new Error("source_bootstrap_requires_online_mode");
  if (String(env.DB_WRITE_ENABLED).toLowerCase() !== "true") throw new Error("source_bootstrap_requires_database_write");
  for (const name of ["REAL_AI_ENABLED", "UTOM_PAID_AI_ENABLED", "BACKGROUND_JOBS_ENABLED", "UTOM_V2_ENABLED"]) {
    if (String(env[name] || "false").toLowerCase() !== "false") throw new Error(`source_bootstrap_requires_${name.toLowerCase()}_false`);
  }
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((name) => !String(env[name] || "").trim());
  if (missing.length) throw new Error(`source_bootstrap_missing:${missing.join(",")}`);
}

async function bootstrapCanonicalSources(connection) {
  const placeholders = SOURCES.map(() => "(?,?,?,?,1)").join(",");
  const values = SOURCES.flatMap((source) => [source.key, source.displayName, source.homepageUrl, source.feedUrl]);
  const [result] = await connection.execute(
    `INSERT INTO sources (slug,name,homepage_url,feed_url,is_active) VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE name=VALUES(name),homepage_url=VALUES(homepage_url),feed_url=VALUES(feed_url),is_active=1`,
    values,
  );
  const [rows] = await connection.query(
    "SELECT id,slug,name,homepage_url homepageUrl,feed_url feedUrl,is_active isActive FROM sources WHERE slug IN (" + SOURCES.map(() => "?").join(",") + ") ORDER BY slug",
    SOURCES.map((source) => source.key),
  );
  return { affectedRows: Number(result.affectedRows || 0), sources: rows };
}

async function main() {
  assertSafeEnvironment();
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 5000,
  });
  try {
    const result = await bootstrapCanonicalSources(connection);
    if (result.sources.length !== SOURCES.length || result.sources.some((source) => Number(source.isActive) !== 1)) {
      throw new Error("source_bootstrap_verification_failed");
    }
    console.log(JSON.stringify({ status: "ok", canonicalSourceCount: result.sources.length, sources: result.sources.map(({ id, slug, name, homepageUrl, feedUrl, isActive }) => ({ id: Number(id), slug, name, homepageUrl, feedUrl, isActive: Number(isActive) })) }, null, 2));
  } finally {
    await connection.end();
  }
}

if (require.main === module) main().catch((error) => { console.error(`SOURCE_BOOTSTRAP: FAIL ${error.message}`); process.exitCode = 1; });

module.exports = { assertSafeEnvironment, bootstrapCanonicalSources };
