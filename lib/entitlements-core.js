"use strict";

function evaluatePremium(user, now = new Date()) {
  if (!user) return { active: false, reason: "user_not_found", premiumUntil: null, tier: null };
  const flagged = user.is_premium === true || user.is_premium === 1 || user.is_premium === "1";
  const premiumUntil = user.premium_until ? new Date(String(user.premium_until)) : null;
  const hasValidDate = !premiumUntil || (!Number.isNaN(premiumUntil.getTime()) && premiumUntil > now);
  if (!flagged) return { active: false, reason: "not_premium", premiumUntil, tier: null };
  if (!hasValidDate) return { active: false, reason: "expired", premiumUntil, tier: null };
  return {
    active: true,
    reason: "active",
    premiumUntil,
    tier: typeof user.premium_tier === "string" ? user.premium_tier : null,
  };
}

module.exports = { evaluatePremium };
