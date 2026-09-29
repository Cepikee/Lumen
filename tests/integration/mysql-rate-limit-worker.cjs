"use strict";
const mysql = require("mysql2/promise");
const { consumeRateLimit } = require("../../lib/shared-rate-limit");
const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
const pool = mysql.createPool({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), connectionLimit: 4 });
(async () => {
  const [identity, attempts, limit, windowMs, nowMs] = process.argv.slice(2);
  const results = await Promise.all(Array.from({ length: Number(attempts) }, () => consumeRateLimit(pool, { scope: "fixture", identity, limit: Number(limit), windowMs: Number(windowMs), nowMs: Number(nowMs) })));
  console.log(JSON.stringify({ accepted: results.filter((item) => item.accepted).length, rejected: results.filter((item) => !item.accepted).length }));
  await pool.end();
})().catch(async (error) => { console.error(error.message); await pool.end(); process.exit(1); });
