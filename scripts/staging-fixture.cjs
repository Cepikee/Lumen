#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { loadMigrations, applyMigrations } = require("../db/migration-core.cjs");

async function main() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const baseline = loadMigrations().filter((item) => Number(item.version) <= 21);
    const applied = await applyMigrations(connection, baseline);
    await connection.execute("INSERT INTO sources(slug,name,homepage_url) VALUES ('fixture','Fixture Source','https://fixture.invalid'),('legacy-other','Legacy Other','https://other.invalid')");
    await connection.execute("INSERT INTO clusters(first_published_at,first_source,title) VALUES ('2026-09-28 10:00:00','fixture','Rehearsal cluster')");
    const embedding = JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
    for (const [index, status] of ["pending", "done", "failed"].entries()) {
      await connection.execute(
        "INSERT INTO articles(title,url_canonical,content_text,published_at,source_id,source,status,embedding,cluster_id) VALUES (?,?,?,?,?,?,?,?,1)",
        [`Legacy ${status}`, `https://fixture.invalid/legacy-${status}`, "legacy content ".repeat(50), `2026-09-28 10:0${index}:00`, index === 2 ? 2 : 1, index === 2 ? "legacy-other" : "fixture", status, embedding],
      );
    }
    await connection.execute("INSERT INTO summaries(article_id,content,detailed_content,source) VALUES (2,'summary','detail','fixture')");
    await connection.execute("INSERT INTO keywords(article_id,keyword) VALUES (2,'rehearsal')");
    await connection.execute("INSERT INTO trends(keyword,period,source) VALUES ('rehearsal','7d','fixture')");
    await connection.execute("INSERT INTO speed_index(source,avg_delay_minutes,median_delay_minutes) VALUES ('fixture',5,5)");
    await connection.execute("INSERT INTO speed_index_history(source,delay_minutes) VALUES ('fixture',5)");
    console.log(JSON.stringify({ applied: applied.length, fixture: "pre-upgrade-001-021" }));
  } finally { await connection.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
