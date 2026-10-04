"use strict";

/**
 * When proxy headers are intentionally not trusted, getIp() returns a
 * process-wide sentinel. Rate limiting that sentinel alone would let one
 * attacker lock out every account on the instance. Keep the trusted-IP
 * limiter, but scope the sentinel fallback to the normalized email too.
 */
function getLoginAttemptScope(ip, email) {
  const identity = String(ip || "");
  if (identity === "direct" || identity === "unknown") {
    return {
      where: "ip = ? AND email = ?",
      params: [identity, String(email || "")],
    };
  }
  return {
    where: "ip = ?",
    params: [identity],
  };
}

module.exports = { getLoginAttemptScope };
