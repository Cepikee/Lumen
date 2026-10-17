"use strict";

require("dotenv").config({ path: process.env.UTOM_ENV_FILE || ".env.local" });
const mysql = require("mysql2/promise");

const rawId = process.argv[2];
if (!/^\d+$/.test(rawId || "") || Number(rawId) < 1 || !Number.isSafeInteger(Number(rawId))) {
  throw new Error("Usage: npm run image:regenerate -- <articleId>");
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME || "utom_dev", connectionLimit: 2,
  });
  try {
    const [result] = await pool.execute(
      `INSERT INTO article_images (article_id, force_revision) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE force_revision=force_revision+1, image_status='pending', prompt_status='pending', generation_status='pending',
         worker_id=NULL, claim_token=NULL, claimed_at=NULL, heartbeat_at=NULL, last_error_code=NULL, last_error_message=NULL`,
      [Number(rawId)],
    );
    console.log(JSON.stringify({ articleId: Number(rawId), queued: result.affectedRows > 0 }));
  } finally { await pool.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
