"use strict";

const crypto = require("node:crypto");

function keyFromEnv(env = process.env) {
  const value = String(env.EMAIL_OUTBOX_ENCRYPTION_KEY || "");
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("email_outbox_key_missing_or_invalid");
  return key;
}

function encryptPayload(payload, env = process.env) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", keyFromEnv(env), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptPayload(value, env = process.env) {
  const [iv, tag, encrypted] = String(value).split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("invalid_outbox_payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromEnv(env), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"));
}

async function enqueueEmail(connection, { operationKey, kind, recipient, payload }) {
  const recipientHash = crypto.createHash("sha256").update(String(recipient).trim().toLowerCase()).digest("hex");
  await connection.execute(
    "INSERT INTO email_outbox(operation_key,message_kind,recipient_hash,payload_encrypted) VALUES (?,?,?,?)",
    [operationKey, kind, recipientHash, encryptPayload(payload)],
  );
}

async function claimNextEmail(pool) {
  const connection = await pool.getConnection(), claimToken = crypto.randomBytes(32).toString("hex");
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT id,payload_encrypted FROM email_outbox WHERE status='pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");
    if (!rows[0]) { await connection.commit(); return null; }
    await connection.execute("UPDATE email_outbox SET status='uncertain',claim_token=?,attempt_count=attempt_count+1 WHERE id=? AND status='pending'", [claimToken, rows[0].id]);
    await connection.commit();
    return { id: Number(rows[0].id), claimToken, payload: decryptPayload(rows[0].payload_encrypted) };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function markEmailSent(pool, item) {
  const [result] = await pool.execute("UPDATE email_outbox SET status='sent',sent_at=UTC_TIMESTAMP(6),claim_token=NULL WHERE id=? AND status='uncertain' AND claim_token=?", [item.id, item.claimToken]);
  if (result.affectedRows !== 1) throw new Error("email_outbox_claim_lost");
}

async function processNextEmail(pool, send, hooks = {}) {
  const item = await claimNextEmail(pool);
  if (!item) return null;
  await send(item.payload);
  if (hooks.afterSend) await hooks.afterSend(item);
  await markEmailSent(pool, item);
  return item.id;
}

module.exports = { encryptPayload, decryptPayload, enqueueEmail, claimNextEmail, markEmailSent, processNextEmail };
