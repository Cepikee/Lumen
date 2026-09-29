#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { cleanupExpiredRateLimits } = require("../lib/shared-rate-limit");

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
    connectionLimit: 1,
  });
  try {
    const deleted = await cleanupExpiredRateLimits(pool, Number(process.env.RATE_LIMIT_CLEANUP_BATCH || 500));
    console.log(`rate_limit_cleanup deleted=${deleted}`);
  } finally { await pool.end(); }
}

main().catch(() => { console.error("rate_limit_cleanup failed"); process.exitCode = 1; });
