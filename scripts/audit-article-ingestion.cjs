"use strict";

const mysql = require("mysql2/promise");

async function main() {
  const database = process.env.DB_NAME || "";
  if (process.env.UTOM_INGESTION_AUDIT !== "true" || !database.endsWith("_test")) {
    throw new Error("Read-only ingestion audit requires UTOM_INGESTION_AUDIT=true and a _test database");
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
  });
  try {
    const [canonicalDuplicates] = await connection.query(
      "SELECT url_identity,COUNT(*) count,GROUP_CONCAT(id ORDER BY id) article_ids FROM articles GROUP BY url_identity HAVING COUNT(*)>1",
    );
    const [externalCollisions] = await connection.query(
      "SELECT source_id,external_id,COUNT(*) count,GROUP_CONCAT(id ORDER BY id) article_ids FROM articles WHERE external_id IS NOT NULL GROUP BY source_id,external_id HAVING COUNT(*)>1",
    );
    const [sourceAliases] = await connection.query(
      "SELECT source,COUNT(*) count FROM articles WHERE LOWER(REPLACE(source,'.','')) IN ('24hu','telexhu','hvghu','indexhu','portfoliohu','444hu','origohu') GROUP BY source ORDER BY source",
    );
    const [suspiciousTitles] = await connection.query(
      `SELECT title,DATE_FORMAT(published_at,'%Y-%m-%d %H:%i') published_minute,COUNT(*) count,GROUP_CONCAT(id ORDER BY id) article_ids
       FROM articles GROUP BY title,DATE_FORMAT(published_at,'%Y-%m-%d %H:%i') HAVING COUNT(*)>1`,
    );
    process.stdout.write(`${JSON.stringify({ mode: "read_only", canonicalDuplicates, externalCollisions, sourceAliases, suspiciousTitles }, null, 2)}\n`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
