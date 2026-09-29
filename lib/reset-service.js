"use strict";

const { createHash, randomBytes } = require("node:crypto");
const { enqueueEmail } = require("./email-outbox");

function createOneTimeToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

const FLOWS = Object.freeze({
  password: { tokenTable: "password_reset_tokens", path: "/reset-password", subject: "Jelszó visszaállítása" },
  pin: { tokenTable: "pin_reset_tokens", path: "/reset-pin", subject: "PIN kód visszaállítása" },
});

async function requestReset(pool, { kind, email, ip, baseUrl }) {
  const flow = FLOWS[kind];
  if (!flow) throw new Error("invalid_reset_kind");
  const normalizedEmail = String(email).trim().toLowerCase();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO ${kind === "password" ? "password_reset_requests" : "pin_reset_requests"}(ip,email) VALUES (?,?)`, [ip, normalizedEmail]);
    const [users] = await connection.execute("SELECT id FROM users WHERE email=? LIMIT 1 FOR UPDATE", [normalizedEmail]);
    if (!users[0]) { await connection.commit(); return { created: false }; }
    const userId = Number(users[0].id);
    await connection.execute(`DELETE FROM ${flow.tokenTable} WHERE userId=? AND expiresAt<=UTC_TIMESTAMP()`, [userId]);
    const [active] = await connection.execute(`SELECT id FROM ${flow.tokenTable} WHERE userId=? AND expiresAt>UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1 FOR UPDATE`, [userId]);
    if (active[0]) { await connection.commit(); return { created: false }; }
    const { token, tokenHash } = createOneTimeToken();
    await connection.execute(`INSERT INTO ${flow.tokenTable}(userId,token,expiresAt) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE))`, [userId, tokenHash]);
    const resetUrl = new URL(flow.path, baseUrl); resetUrl.searchParams.set("token", token);
    const text = `${flow.subject}: ${resetUrl.toString()}`;
    await enqueueEmail(connection, { operationKey: `${kind}-reset:${tokenHash}`, kind: `${kind}_reset`, recipient: normalizedEmail, payload: { to: normalizedEmail, subject: flow.subject, text, html: `<p>${flow.subject}:</p><p><a href="${resetUrl.toString()}">${resetUrl.toString()}</a></p>` } });
    await connection.commit();
    return { created: true };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { requestReset };
