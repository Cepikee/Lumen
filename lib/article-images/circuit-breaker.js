"use strict";

function createCircuitBreaker({ failureThreshold = 3, cooldownMs = 300_000, now = Date.now } = {}) {
  let failures = 0;
  let openedAt = 0;
  return {
    canRequest() {
      if (!openedAt) return true;
      if (now() - openedAt >= cooldownMs) { failures = 0; openedAt = 0; return true; }
      return false;
    },
    success() { failures = 0; openedAt = 0; },
    failure() { failures += 1; if (failures >= failureThreshold) openedAt = now(); },
    state() { return openedAt ? "open" : "closed"; },
  };
}

module.exports = { createCircuitBreaker };
