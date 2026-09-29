#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const { processNextEmail } = require("../lib/email-outbox");
const { assertCapability } = require("../lib/config/runtime");

async function main() {
  assertCapability("emailSend");
  const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionLimit: 2 });
  const transport = nodemailer.createTransport({ host: process.env.MAIL_HOST, port: Number(process.env.MAIL_PORT || 587), secure: process.env.MAIL_SECURE === "true", auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
  try {
    const id = await processNextEmail(pool, (payload) => transport.sendMail({ ...payload, from: process.env.MAIL_FROM || '"Utom.hu" <noreply@utom.hu>' }));
    console.log(id ? `email_outbox sent id=${id}` : "email_outbox empty");
  } finally { transport.close(); await pool.end(); }
}

main().catch(() => { console.error("email_outbox processing failed"); process.exitCode = 1; });
