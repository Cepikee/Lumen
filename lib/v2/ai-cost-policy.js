"use strict";

// Q09 owner-approved policy. Costs are integer HUF minor units for the
// decision layer; provider currency conversion belongs to deployment config.
const AI_COST_POLICY = Object.freeze({
  provider: "openai",
  secondaryProvider: null,
  paidAiDefaultEnabled: false,
  monthlySoftLimitHuf: 12000,
  monthlyHardLimitHuf: 15000,
  dailySoftLimitHuf: 350,
  dailyHardLimitHuf: 500,
  perArticleHardLimitHuf: 5,
  perStepHardLimitHuf: 2,
  maxLargeEscalationsPerArticle: 1,
});

function finiteNonNegative(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new TypeError(`${field}_invalid`);
  return n;
}

function createBudgetContext(usage = {}, nextCost = 0) {
  const cost = finiteNonNegative(nextCost, "next_cost");
  const current = {
    dailyCost: finiteNonNegative(usage.dailyCost ?? 0, "daily_cost"),
    monthlyCost: finiteNonNegative(usage.monthlyCost ?? 0, "monthly_cost"),
    perArticleCost: finiteNonNegative(usage.perArticleCost ?? 0, "per_article_cost"),
    perStepCost: finiteNonNegative(usage.perStepCost ?? 0, "per_step_cost"),
  };
  const limits = {
    dailyCost: AI_COST_POLICY.dailyHardLimitHuf,
    monthlyCost: AI_COST_POLICY.monthlyHardLimitHuf,
    perArticleCost: AI_COST_POLICY.perArticleHardLimitHuf,
    perStepCost: AI_COST_POLICY.perStepHardLimitHuf,
  };
  return Object.freeze({ limits: Object.freeze(limits), usage: Object.freeze(current), nextCost: cost });
}

function budgetWarnings(budget) {
  const usage = budget.usage;
  return Object.freeze([
    usage.monthlyCost >= AI_COST_POLICY.monthlySoftLimitHuf ? "monthly_soft_reached" : null,
    usage.monthlyCost >= AI_COST_POLICY.monthlyHardLimitHuf ? "monthly_hard_reached" : null,
    usage.dailyCost >= AI_COST_POLICY.dailySoftLimitHuf ? "daily_soft_reached" : null,
    usage.dailyCost >= AI_COST_POLICY.dailyHardLimitHuf ? "daily_hard_reached" : null,
    usage.perArticleCost >= AI_COST_POLICY.perArticleHardLimitHuf ? "article_hard_reached" : null,
    usage.perStepCost >= AI_COST_POLICY.perStepHardLimitHuf ? "step_hard_reached" : null,
  ].filter(Boolean));
}

module.exports = { AI_COST_POLICY, createBudgetContext, budgetWarnings };
