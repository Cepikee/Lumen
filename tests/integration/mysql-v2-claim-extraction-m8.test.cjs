"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { applyMigrations, loadMigrations } = require("../../db/migration-core.cjs");
const { persistClaimsWithEvidence } = require("../../lib/v2/claim-extraction-repository");

const enabled = process.env.UTOM_MYSQL_TEST_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function connect() {
  const url = new URL(process.env.UTOM_TEST_MYSQL_URL);
  return mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
}

test("M8 MySQL claim/evidence atomicity, attribution, retry and rollback", { skip: !enabled }, async () => {
  const connection = await connect();
  try {
    await applyMigrations(connection, loadMigrations());
    const suffix = Date.now();
    await connection.beginTransaction();
    const [article] = await connection.execute("INSERT INTO articles (title,url_canonical,original_url,content_text,status) VALUES (?,?,?,?,?)", [`M8 ${suffix}`, `https://example.com/m8-${suffix}`, `https://example.com/m8-${suffix}`, "A vállalat 12 millió forintot költött.", "pending"]);
    const claim = { subjectEntityId: null, predicate: "SPENT_AMOUNT", objectEntityId: null, value: { amount: 12000000, unit: "HUF" }, normalizedValue: "12000000 HUF", claimType: "numeric", status: "observed", confidence: 0.9, supportType: "reported", attributionType: "quoted", attributionEntityId: null, polarity: "affirmed", uncertainty: false, conditional: false, evidence: { start: 0, end: 38, textSpan: "A vállalat 12 millió forintot költött." } };
    const first = await persistClaimsWithEvidence(connection, { claims: [claim], articleId: article.insertId, publicationTime: new Date() });
    const retry = await persistClaimsWithEvidence(connection, { claims: [claim], articleId: article.insertId, publicationTime: new Date() });
    assert.equal(first.claims[0].claimId, retry.claims[0].claimId);
    const [[counts]] = await connection.execute("SELECT (SELECT COUNT(*) FROM v2_claims WHERE article_id=?) claims, (SELECT COUNT(*) FROM v2_claim_evidence WHERE article_id=?) evidence", [article.insertId, article.insertId]);
    assert.deepEqual([Number(counts.claims), Number(counts.evidence)], [1, 1]);
    await connection.rollback();
    const [[afterRollback]] = await connection.execute("SELECT COUNT(*) count FROM articles WHERE id=?", [article.insertId]);
    assert.equal(Number(afterRollback.count), 0);
  } finally { await connection.end(); }
});

console.log("M8 MySQL claim/evidence integration regression: PASS");
