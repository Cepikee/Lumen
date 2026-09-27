"use strict";

const mysql = require("mysql2/promise");
const { randomUUID } = require("node:crypto");

(async () => {
  const articleId = Number(process.argv[2]);
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  try {
    const token = randomUUID();
    const [result] = await connection.execute(
      "UPDATE articles SET status='in_progress', worker_id=?, claim_token=?, claimed_at=UTC_TIMESTAMP(6), heartbeat_at=UTC_TIMESTAMP(6), processing_attempts=processing_attempts+1 WHERE id=? AND status='pending'",
      [`process-${process.pid}`, token, articleId],
    );
    process.stdout.write(JSON.stringify({ won: result.affectedRows === 1, token }));
  } finally {
    await connection.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
