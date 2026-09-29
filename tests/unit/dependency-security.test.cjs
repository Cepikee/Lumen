"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("upgraded Nodemailer creates an offline transport without SMTP activity", async () => {
  const nodemailer = require("nodemailer");
  assert.equal(require("nodemailer/package.json").version, "10.0.12");
  const transport = nodemailer.createTransport({ jsonTransport: true, disableFileAccess: true, disableUrlAccess: true });
  const result = await transport.sendMail({ from: "fixture@example.invalid", to: "recipient@example.invalid", subject: "fixture", text: "offline" });
  assert.match(String(result.message), /fixture/);
  transport.close();
});
