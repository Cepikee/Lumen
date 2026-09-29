"use strict";
const { timingSafeEqual } = require("node:crypto");

function isValidInternalToken(authorization, configured) {
  if (!configured || String(configured).length < 32) return false;
  const supplied = String(authorization || "").startsWith("Bearer ") ? String(authorization).slice(7) : "";
  const expectedBytes = Buffer.from(String(configured), "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

module.exports = { isValidInternalToken };
